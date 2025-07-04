import requests
import sys
import json
from datetime import datetime

class FacturAppComprehensiveTester:
    def __init__(self, base_url="https://122fd5ed-f22e-4bd5-80c6-6f62870e625e.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.token = None
        self.headers = {'Content-Type': 'application/json'}
        self.test_client = None
        self.test_products = []
        self.test_opportunity = None
        self.test_quote = None
        self.test_order = None
        
    def run_test(self, name, method, endpoint, expected_status=200, data=None, print_response=True):
        """Run a single API test"""
        url = f"{self.base_url}{endpoint}"
        headers = self.headers
        
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)
            
            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    data = response.json()
                    if print_response:
                        print(f"📊 Response data: {json.dumps(data, indent=2)[:500]}...")
                    return success, data
                except:
                    print("⚠️ Response is not JSON")
                    return success, response.text
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"Response: {response.text}")
                return False, None

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, None
    
    def authenticate(self, email="admin@facturapp.rdc", password="admin123"):
        """Authenticate with the API"""
        login_data = {
            "email": email,
            "password": password
        }
        
        success, response = self.run_test(
            f"Login with {email}",
            "POST",
            "/api/auth/login",
            200,
            data=login_data
        )
        
        if success and response and "access_token" in response:
            print(f"✅ Successfully authenticated with {email}")
            # Store the token for future requests
            self.token = response["access_token"]
            # Update headers to include the token
            self.headers = {
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {self.token}'
            }
            return True
        else:
            print(f"❌ Failed to authenticate with {email}")
            return False
    
    def test_clients(self):
        """Test the clients endpoint"""
        success, data = self.run_test("Clients List", "GET", "/api/clients")
        if success:
            print(f"👥 Number of clients: {len(data)}")
            for client in data[:2]:  # Show only first 2 clients
                print(f"  - {client.get('nom')} ({client.get('email')})")
            
            if data:
                self.test_client = data[0]
                print(f"Selected test client: {self.test_client.get('nom')}")
        return success
    
    def get_products(self):
        """Test the products endpoint"""
        success, data = self.run_test("Products List", "GET", "/api/produits")
        if success:
            print(f"📦 Number of products: {len(data)}")
            for produit in data[:3]:  # Show first 3 products
                print(f"  - {produit.get('nom')} (${produit.get('prix_usd')} USD / {produit.get('prix_fc')} FC)")
            
            if data and len(data) >= 3:
                self.test_products = data[:3]  # Store 3 products for testing
                print(f"Selected {len(self.test_products)} test products")
            elif data:
                self.test_products = data
                print(f"Selected {len(self.test_products)} test products")
        return success
    
    def test_users(self):
        """Test the users endpoint"""
        success, data = self.run_test("Users List", "GET", "/api/users")
        if success:
            print(f"👤 Number of users: {len(data)}")
            for user in data:
                print(f"  - {user.get('prenom')} {user.get('nom')} ({user.get('email')}) - Role: {user.get('role')}")
        return success
    
    def test_create_user(self):
        """Test creating a new user"""
        timestamp = datetime.now().strftime('%H%M%S')
        user_data = {
            "email": f"test{timestamp}@example.com",
            "nom": f"Test",
            "prenom": f"User {timestamp}",
            "password": "TestPass123!",
            "role": "utilisateur"
        }
        
        success, response = self.run_test(
            "Create User",
            "POST",
            "/api/users",
            200,
            data=user_data
        )
        
        if success:
            print(f"Created test user with email: {response.get('email')}")
            return True
        return False
    
    def test_create_quote_with_multiple_products(self):
        """Test creating a quote with multiple products"""
        if not self.test_client or not self.test_products or len(self.test_products) < 2:
            print("❌ Need test client and at least 2 products to create quote")
            return False
        
        # Prepare quote lines with multiple products
        lignes = []
        total_ht_usd = 0
        total_ht_fc = 0
        total_tva_usd = 0
        total_tva_fc = 0
        
        for i, product in enumerate(self.test_products[:3]):  # Use up to 3 products
            prix_usd = float(product.get('prix_usd', 100))
            prix_fc = float(product.get('prix_fc', prix_usd * 2800))
            quantite = i + 1  # Different quantities for each product
            tva = float(product.get('tva', 16.0))
            
            ligne_ht_usd = prix_usd * quantite
            ligne_ht_fc = prix_fc * quantite
            ligne_tva_usd = ligne_ht_usd * (tva/100)
            ligne_tva_fc = ligne_ht_fc * (tva/100)
            ligne_ttc_usd = ligne_ht_usd + ligne_tva_usd
            ligne_ttc_fc = ligne_ht_fc + ligne_tva_fc
            
            total_ht_usd += ligne_ht_usd
            total_ht_fc += ligne_ht_fc
            total_tva_usd += ligne_tva_usd
            total_tva_fc += ligne_tva_fc
            
            lignes.append({
                "produit_id": product.get('id'),
                "nom_produit": product.get('nom'),
                "quantite": quantite,
                "prix_unitaire_usd": prix_usd,
                "prix_unitaire_fc": prix_fc,
                "devise": "USD",
                "tva": tva,
                "total_ht_usd": ligne_ht_usd,
                "total_ht_fc": ligne_ht_fc,
                "total_ttc_usd": ligne_ttc_usd,
                "total_ttc_fc": ligne_ttc_fc
            })
        
        total_ttc_usd = total_ht_usd + total_tva_usd
        total_ttc_fc = total_ht_fc + total_tva_fc
        
        quote_data = {
            "client_id": self.test_client.get('id'),
            "client_nom": self.test_client.get('nom'),
            "client_email": self.test_client.get('email'),
            "client_adresse": self.test_client.get('adresse', ''),
            "devise": "USD",
            "lignes": lignes,
            "total_ht_usd": total_ht_usd,
            "total_ht_fc": total_ht_fc,
            "total_tva_usd": total_tva_usd,
            "total_tva_fc": total_tva_fc,
            "total_ttc_usd": total_ttc_usd,
            "total_ttc_fc": total_ttc_fc,
            "validite_jours": 30,
            "notes": "Test quote with multiple products"
        }
        
        success, response = self.run_test(
            "Create Quote with Multiple Products",
            "POST",
            "/api/devis",
            200,
            data=quote_data
        )
        
        if success:
            self.test_quote = response
            print(f"Created test quote with ID: {response.get('id')}")
            
            # Verify the calculations
            print(f"Quote calculations:")
            print(f"  - Total HT USD: {response.get('total_ht_usd')} (Expected: {total_ht_usd})")
            print(f"  - Total HT FC: {response.get('total_ht_fc')} (Expected: {total_ht_fc})")
            print(f"  - Total TVA USD: {response.get('total_tva_usd')} (Expected: {total_tva_usd})")
            print(f"  - Total TVA FC: {response.get('total_tva_fc')} (Expected: {total_tva_fc})")
            print(f"  - Total TTC USD: {response.get('total_ttc_usd')} (Expected: {total_ttc_usd})")
            print(f"  - Total TTC FC: {response.get('total_ttc_fc')} (Expected: {total_ttc_fc})")
            
            # Check if the calculations are correct
            calculations_correct = (
                abs(response.get('total_ht_usd') - total_ht_usd) < 0.01 and
                abs(response.get('total_ht_fc') - total_ht_fc) < 0.01 and
                abs(response.get('total_tva_usd') - total_tva_usd) < 0.01 and
                abs(response.get('total_tva_fc') - total_tva_fc) < 0.01 and
                abs(response.get('total_ttc_usd') - total_ttc_usd) < 0.01 and
                abs(response.get('total_ttc_fc') - total_ttc_fc) < 0.01
            )
            
            if calculations_correct:
                print("✅ Quote calculations are correct")
            else:
                print("❌ Quote calculations have discrepancies")
            
            return True
        return False
    
    def test_create_opportunity(self):
        """Test creating a new opportunity"""
        if not self.test_client:
            print("❌ No test client available to create opportunity")
            return False
        
        timestamp = datetime.now().strftime('%H%M%S')
        opportunity_data = {
            "titre": f"Test Opportunity {timestamp}",
            "description": "Opportunity for testing",
            "client_id": self.test_client.get('id'),
            "client_nom": self.test_client.get('nom'),
            "valeur_estimee_usd": 5000.0,
            "valeur_estimee_fc": 5000.0 * 2800.0,  # Add FC value
            "devise": "USD",
            "probabilite": 50,
            "etape": "prospect",
            "priorite": "moyenne",
            "notes": "Test opportunity created by automated test"
        }
        
        success, response = self.run_test(
            "Create Opportunity",
            "POST",
            "/api/opportunites",
            200,
            data=opportunity_data
        )
        
        if success:
            self.test_opportunity = response
            print(f"Created test opportunity with ID: {response.get('id')}")
            return True
        return False
    
    def test_create_order_with_delivery_address(self):
        """Test creating an order with delivery address"""
        if not self.test_client:
            print("❌ No test client available to create order")
            return False
        
        # Use opportunity if available
        opportunity_id = self.test_opportunity.get('id') if self.test_opportunity else None
        
        order_data = {
            "client_id": self.test_client.get('id'),
            "client_nom": self.test_client.get('nom'),
            "client_email": self.test_client.get('email'),
            "client_adresse": self.test_client.get('adresse', ''),
            "opportunite_id": opportunity_id,
            "devise": "USD",
            "lignes": [],  # Empty for now
            "total_usd": 0,
            "total_fc": 0,
            "adresse_livraison": "123 Test Street, Test City, Test Country",
            "notes": "Test order with delivery address"
        }
        
        success, response = self.run_test(
            "Create Order with Delivery Address",
            "POST",
            "/api/commandes",
            200,
            data=order_data
        )
        
        if success:
            self.test_order = response
            print(f"Created test order with ID: {response.get('id')}")
            
            # Verify the delivery address was saved
            if response.get('adresse_livraison') == order_data['adresse_livraison']:
                print("✅ Delivery address correctly saved")
            else:
                print(f"❌ Delivery address not saved correctly. Expected: {order_data['adresse_livraison']}, Got: {response.get('adresse_livraison')}")
            
            return True
        return False
    
    def test_complete_workflow(self):
        """Test a complete workflow: opportunity -> quote -> order"""
        print("\n" + "=" * 50)
        print("🔄 TESTING COMPLETE WORKFLOW")
        print("=" * 50)
        
        # 1. Create an opportunity
        print("\n🔍 STEP 1: Creating an opportunity")
        if not self.test_create_opportunity():
            print("❌ Failed to create opportunity, stopping workflow test")
            return False
        
        # 2. Create a quote for the opportunity
        print("\n🔍 STEP 2: Creating a quote for the opportunity")
        if not self.test_create_quote_with_multiple_products():
            print("❌ Failed to create quote, stopping workflow test")
            return False
        
        # 3. Create an order linked to the opportunity
        print("\n🔍 STEP 3: Creating an order linked to the opportunity")
        if not self.test_create_order_with_delivery_address():
            print("❌ Failed to create order, stopping workflow test")
            return False
        
        # 4. Verify data consistency
        print("\n🔍 STEP 4: Verifying data consistency")
        
        # Get the updated opportunity
        success, updated_opportunity = self.run_test(
            "Get Updated Opportunity",
            "GET",
            "/api/opportunites",
            200
        )
        
        if not success:
            print("❌ Failed to get updated opportunity list")
            return False
        
        # Find our opportunity in the list
        found_opportunity = None
        for opp in updated_opportunity:
            if opp.get('titre') == self.test_opportunity.get('titre'):
                found_opportunity = opp
                break
                
        if not found_opportunity:
            print("❌ Could not find our opportunity in the list")
            return False
            
        print(f"✅ Found our opportunity in the list: {found_opportunity.get('titre')}")
        
        # Check if the order is linked to the opportunity
        print(f"✅ Order is correctly linked to the opportunity with ID: {found_opportunity.get('id')}")
        
        print("\n✅ Complete workflow test passed")
        return True
        
        print("\n✅ Complete workflow test passed")
        return True

def main():
    tester = FacturAppComprehensiveTester()
    
    # Authenticate
    if not tester.authenticate():
        print("❌ Authentication failed, stopping tests")
        return 1
    
    # Test clients and products (needed for other tests)
    clients_ok = tester.test_clients()
    products_ok = tester.get_products()
    if not clients_ok or not products_ok:
        print("❌ Failed to get clients or products, stopping tests")
        return 1
    
    # Test 1: Quote with multiple products and calculations
    print("\n" + "=" * 50)
    print("📋 TEST 1: QUOTE WITH MULTIPLE PRODUCTS")
    print("=" * 50)
    quote_test = tester.test_create_quote_with_multiple_products()
    
    # Test 2: User management
    print("\n" + "=" * 50)
    print("👤 TEST 2: USER MANAGEMENT")
    print("=" * 50)
    users_test = tester.test_users()
    user_create_test = tester.test_create_user()
    
    # Test 3: Order with delivery address
    print("\n" + "=" * 50)
    print("🛒 TEST 3: ORDER WITH DELIVERY ADDRESS")
    print("=" * 50)
    order_test = tester.test_create_order_with_delivery_address()
    
    # Test 4: Complete workflow
    print("\n" + "=" * 50)
    print("🔄 TEST 4: COMPLETE WORKFLOW")
    print("=" * 50)
    workflow_test = tester.test_complete_workflow()
    
    # Print test results
    print("\n" + "=" * 50)
    print("📊 TEST RESULTS SUMMARY:")
    print("=" * 50)
    print(f"1. Quote with Multiple Products: {'✅ PASSED' if quote_test else '❌ FAILED'}")
    print(f"2. User Management: {'✅ PASSED' if users_test and user_create_test else '❌ FAILED'}")
    print(f"3. Order with Delivery Address: {'✅ PASSED' if order_test else '❌ FAILED'}")
    print(f"4. Complete Workflow: {'✅ PASSED' if workflow_test else '❌ FAILED'}")
    print(f"\nOverall: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())