import requests
import sys
import json
from datetime import datetime

class Phase2InvoiceManagementTester:
    def __init__(self, base_url="https://d49f146a-1c74-4ae7-997f-d63e95bc382e.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.token = None
        self.headers = {'Content-Type': 'application/json'}
        self.test_client = None
        self.test_product = None
        self.test_invoice_draft = None
        self.test_invoice_sent = None
        self.test_invoice_paid = None

    def authenticate(self, email, password):
        """Authenticate and get token"""
        auth_data = {"email": email, "password": password}
        
        try:
            response = requests.post(f"{self.base_url}/api/auth/login", json=auth_data)
            if response.status_code == 200:
                data = response.json()
                self.token = data.get('access_token')
                self.headers['Authorization'] = f'Bearer {self.token}'
                user_info = data.get('user', {})
                print(f"✅ Authenticated as {user_info.get('nom')} ({user_info.get('role')})")
                return True, user_info
            else:
                print(f"❌ Authentication failed: {response.text}")
                return False, None
        except Exception as e:
            print(f"❌ Authentication error: {str(e)}")
            return False, None

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
                if data:
                    # For DELETE with body data
                    response = requests.delete(url, json=data, headers=headers)
                else:
                    response = requests.delete(url, headers=headers)
            
            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if print_response:
                        print(f"📊 Response: {json.dumps(response_data, indent=2)[:500]}...")
                    return success, response_data
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

    def setup_test_data(self):
        """Create test client and product for invoice tests"""
        print("\n" + "=" * 60)
        print("🔧 SETTING UP TEST DATA")
        print("=" * 60)
        
        # Create test client
        timestamp = datetime.now().strftime('%H%M%S')
        client_data = {
            "nom": f"Test Client Phase2 {timestamp}",
            "email": f"testphase2{timestamp}@example.com",
            "telephone": "+243 81 234 5678",
            "adresse": "Avenue Test Phase2 123",
            "ville": "Kinshasa",
            "code_postal": "12345",
            "pays": "RDC",
            "devise_preferee": "USD"
        }
        
        success, client = self.run_test(
            "Create Test Client",
            "POST",
            "/api/clients",
            200,
            data=client_data,
            print_response=False
        )
        
        if not success:
            print("❌ Failed to create test client")
            return False
        
        self.test_client = client
        print(f"✅ Created test client: {client.get('nom')}")
        
        # Create test product with stock management
        product_data = {
            "nom": f"Test Product Phase2 {timestamp}",
            "description": "Product for Phase 2 testing",
            "prix_usd": 100.0,
            "unite": "unité",
            "tva": 16.0,
            "actif": True,
            "gestion_stock": True,
            "stock_actuel": 100,
            "stock_minimum": 10,
            "stock_maximum": 200
        }
        
        success, product = self.run_test(
            "Create Test Product",
            "POST",
            "/api/produits",
            200,
            data=product_data,
            print_response=False
        )
        
        if not success:
            print("❌ Failed to create test product")
            return False
        
        self.test_product = product
        print(f"✅ Created test product: {product.get('nom')} (Stock: {product.get('stock_actuel')})")
        
        return True

    def create_test_invoice(self, status="brouillon"):
        """Create a test invoice with specified status"""
        if not self.test_client or not self.test_product:
            print("❌ Need test client and product to create invoice")
            return None
        
        # Calculate prices
        prix_usd = float(self.test_product.get('prix_usd', 100))
        prix_fc = prix_usd * 2800  # Exchange rate
        quantite = 5
        tva = float(self.test_product.get('tva', 16.0))
        
        total_ht_usd = prix_usd * quantite
        total_ht_fc = prix_fc * quantite
        total_tva_usd = total_ht_usd * (tva/100)
        total_tva_fc = total_ht_fc * (tva/100)
        total_ttc_usd = total_ht_usd + total_tva_usd
        total_ttc_fc = total_ht_fc + total_tva_fc
        
        invoice_data = {
            "client_id": self.test_client.get('id'),
            "client_nom": self.test_client.get('nom'),
            "client_email": self.test_client.get('email'),
            "client_adresse": f"{self.test_client.get('adresse')}, {self.test_client.get('ville')} {self.test_client.get('code_postal')}",
            "devise": "USD",
            "lignes": [
                {
                    "produit_id": self.test_product.get('id'),
                    "nom_produit": self.test_product.get('nom'),
                    "quantite": quantite,
                    "prix_unitaire_usd": prix_usd,
                    "prix_unitaire_fc": prix_fc,
                    "devise": "USD",
                    "tva": tva,
                    "total_ht_usd": total_ht_usd,
                    "total_ht_fc": total_ht_fc,
                    "total_ttc_usd": total_ttc_usd,
                    "total_ttc_fc": total_ttc_fc
                }
            ],
            "total_ht_usd": total_ht_usd,
            "total_ht_fc": total_ht_fc,
            "total_tva_usd": total_tva_usd,
            "total_tva_fc": total_tva_fc,
            "total_ttc_usd": total_ttc_usd,
            "total_ttc_fc": total_ttc_fc,
            "notes": f"Test invoice for Phase 2 - Status: {status}"
        }
        
        success, invoice = self.run_test(
            f"Create Test Invoice ({status})",
            "POST",
            "/api/factures",
            200,
            data=invoice_data,
            print_response=False
        )
        
        if not success:
            return None
        
        # Change status if needed
        if status == "envoyee":
            self.run_test(
                "Send Invoice",
                "POST",
                f"/api/factures/{invoice.get('id')}/envoyer",
                200,
                print_response=False
            )
            # Get updated invoice
            _, invoice = self.run_test(
                "Get Updated Invoice",
                "GET",
                f"/api/factures/{invoice.get('id')}",
                200,
                print_response=False
            )
        elif status == "payee":
            # First send, then mark as paid
            self.run_test(
                "Send Invoice",
                "POST",
                f"/api/factures/{invoice.get('id')}/envoyer",
                200,
                print_response=False
            )
            self.run_test(
                "Mark as Paid",
                "POST",
                f"/api/factures/{invoice.get('id')}/payer",
                200,
                print_response=False
            )
            # Get updated invoice
            _, invoice = self.run_test(
                "Get Updated Invoice",
                "GET",
                f"/api/factures/{invoice.get('id')}",
                200,
                print_response=False
            )
        
        return invoice

    def test_permissions(self):
        """Test that only comptable/manager/admin can access cancellation and deletion"""
        print("\n" + "=" * 60)
        print("🔐 TESTING PERMISSIONS FOR CANCELLATION AND DELETION")
        print("=" * 60)
        
        # Test with different user roles
        test_users = [
            {"email": "utilisateur@demo.com", "password": "utilisateur123", "role": "utilisateur", "should_fail": True},
            {"email": "comptable@demo.com", "password": "comptable123", "role": "comptable", "should_fail": False},
            {"email": "manager@demo.com", "password": "manager123", "role": "manager", "should_fail": False},
            {"email": "admin@facturapp.rdc", "password": "admin123", "role": "admin", "should_fail": False}
        ]
        
        # Create a test invoice for permission testing
        auth_success, _ = self.authenticate("admin@facturapp.rdc", "admin123")
        if not auth_success:
            print("❌ Failed to authenticate as admin for setup")
            return False
        
        if not self.setup_test_data():
            return False
        
        test_invoice = self.create_test_invoice("brouillon")
        if not test_invoice:
            print("❌ Failed to create test invoice for permission testing")
            return False
        
        invoice_id = test_invoice.get('id')
        
        all_permissions_correct = True
        
        for user in test_users:
            print(f"\n🔍 Testing permissions for {user['role']} user")
            
            # Authenticate as this user
            auth_success, user_info = self.authenticate(user['email'], user['password'])
            if not auth_success:
                print(f"❌ Failed to authenticate as {user['role']}")
                continue
            
            # Test cancellation permission
            expected_status = 403 if user['should_fail'] else 200
            success, _ = self.run_test(
                f"Test Cancellation Permission ({user['role']})",
                "POST",
                f"/api/factures/{invoice_id}/annuler",
                expected_status,
                data={"motif": "Test permission"},
                print_response=False
            )
            
            if user['should_fail'] and success:
                print(f"❌ {user['role']} should NOT be able to cancel invoices")
                all_permissions_correct = False
            elif not user['should_fail'] and not success:
                print(f"❌ {user['role']} should be able to cancel invoices")
                all_permissions_correct = False
            else:
                print(f"✅ {user['role']} permission for cancellation is correct")
            
            # Test deletion permission (only if cancellation worked or was properly denied)
            if not user['should_fail']:
                # Create another invoice for deletion test
                test_invoice_del = self.create_test_invoice("brouillon")
                if test_invoice_del:
                    success, _ = self.run_test(
                        f"Test Deletion Permission ({user['role']})",
                        "DELETE",
                        f"/api/factures/{test_invoice_del.get('id')}",
                        200,
                        data={"motif": "Test permission"},
                        print_response=False
                    )
                    
                    if not success:
                        print(f"❌ {user['role']} should be able to delete invoices")
                        all_permissions_correct = False
                    else:
                        print(f"✅ {user['role']} permission for deletion is correct")
        
        return all_permissions_correct

    def test_invoice_cancellation(self):
        """Test invoice cancellation functionality"""
        print("\n" + "=" * 60)
        print("🚫 TESTING INVOICE CANCELLATION")
        print("=" * 60)
        
        # Authenticate as admin
        auth_success, _ = self.authenticate("admin@facturapp.rdc", "admin123")
        if not auth_success:
            print("❌ Failed to authenticate as admin")
            return False
        
        if not self.setup_test_data():
            return False
        
        # Test 1: Cancel a draft invoice
        print("\n🔍 Test 1: Cancel a draft invoice")
        draft_invoice = self.create_test_invoice("brouillon")
        if not draft_invoice:
            print("❌ Failed to create draft invoice")
            return False
        
        # Get initial stock
        _, initial_product = self.run_test(
            "Get Initial Product Stock",
            "GET",
            f"/api/produits/{self.test_product.get('id')}",
            200,
            print_response=False
        )
        initial_stock = initial_product.get('stock_actuel', 0)
        print(f"📦 Initial stock: {initial_stock}")
        
        # Cancel the invoice
        success, _ = self.run_test(
            "Cancel Draft Invoice",
            "POST",
            f"/api/factures/{draft_invoice.get('id')}/annuler",
            200,
            data={"motif": "Test cancellation of draft invoice"}
        )
        
        if not success:
            print("❌ Failed to cancel draft invoice")
            return False
        
        # Verify invoice status
        _, cancelled_invoice = self.run_test(
            "Get Cancelled Invoice",
            "GET",
            f"/api/factures/{draft_invoice.get('id')}",
            200,
            print_response=False
        )
        
        if cancelled_invoice.get('statut') != 'annulee':
            print(f"❌ Invoice status not updated correctly: {cancelled_invoice.get('statut')}")
            return False
        
        print("✅ Draft invoice successfully cancelled")
        
        # Verify stock restoration
        _, updated_product = self.run_test(
            "Get Updated Product Stock After Cancellation",
            "GET",
            f"/api/produits/{self.test_product.get('id')}",
            200,
            print_response=False
        )
        
        updated_stock = updated_product.get('stock_actuel', 0)
        print(f"📦 Stock after cancellation: {updated_stock}")
        
        if updated_stock == initial_stock:
            print("✅ Stock correctly restored after cancellation")
        else:
            print(f"❌ Stock not restored correctly. Expected: {initial_stock}, Got: {updated_stock}")
            return False
        
        # Test 2: Try to cancel an already cancelled invoice (should fail)
        print("\n🔍 Test 2: Try to cancel an already cancelled invoice")
        success, _ = self.run_test(
            "Cancel Already Cancelled Invoice",
            "POST",
            f"/api/factures/{draft_invoice.get('id')}/annuler",
            400,  # Should fail
            data={"motif": "Test double cancellation"},
            print_response=False
        )
        
        if success:
            print("❌ Should not be able to cancel an already cancelled invoice")
            return False
        else:
            print("✅ Correctly prevented cancellation of already cancelled invoice")
        
        # Test 3: Try to cancel a paid invoice (should fail)
        print("\n🔍 Test 3: Try to cancel a paid invoice")
        paid_invoice = self.create_test_invoice("payee")
        if not paid_invoice:
            print("❌ Failed to create paid invoice")
            return False
        
        success, _ = self.run_test(
            "Cancel Paid Invoice",
            "POST",
            f"/api/factures/{paid_invoice.get('id')}/annuler",
            400,  # Should fail
            data={"motif": "Test cancellation of paid invoice"},
            print_response=False
        )
        
        if success:
            print("❌ Should not be able to cancel a paid invoice")
            return False
        else:
            print("✅ Correctly prevented cancellation of paid invoice")
        
        # Test 4: Try to cancel without motif (should fail)
        print("\n🔍 Test 4: Try to cancel without motif")
        another_draft = self.create_test_invoice("brouillon")
        if not another_draft:
            print("❌ Failed to create another draft invoice")
            return False
        
        success, _ = self.run_test(
            "Cancel Without Motif",
            "POST",
            f"/api/factures/{another_draft.get('id')}/annuler",
            400,  # Should fail
            data={},  # No motif
            print_response=False
        )
        
        if success:
            print("❌ Should not be able to cancel without motif")
            return False
        else:
            print("✅ Correctly required motif for cancellation")
        
        return True

    def test_invoice_deletion(self):
        """Test invoice deletion functionality"""
        print("\n" + "=" * 60)
        print("🗑️ TESTING INVOICE DELETION")
        print("=" * 60)
        
        # Authenticate as admin
        auth_success, _ = self.authenticate("admin@facturapp.rdc", "admin123")
        if not auth_success:
            print("❌ Failed to authenticate as admin")
            return False
        
        if not self.setup_test_data():
            return False
        
        # Test 1: Delete a draft invoice
        print("\n🔍 Test 1: Delete a draft invoice")
        draft_invoice = self.create_test_invoice("brouillon")
        if not draft_invoice:
            print("❌ Failed to create draft invoice")
            return False
        
        # Get initial stock
        _, initial_product = self.run_test(
            "Get Initial Product Stock",
            "GET",
            f"/api/produits/{self.test_product.get('id')}",
            200,
            print_response=False
        )
        initial_stock = initial_product.get('stock_actuel', 0)
        print(f"📦 Initial stock: {initial_stock}")
        
        # Delete the invoice
        success, _ = self.run_test(
            "Delete Draft Invoice",
            "DELETE",
            f"/api/factures/{draft_invoice.get('id')}",
            200,
            data={"motif": "Test deletion of draft invoice"}
        )
        
        if not success:
            print("❌ Failed to delete draft invoice")
            return False
        
        # Verify invoice is deleted (should return 404)
        success, _ = self.run_test(
            "Try to Get Deleted Invoice",
            "GET",
            f"/api/factures/{draft_invoice.get('id')}",
            404,  # Should not be found
            print_response=False
        )
        
        if not success:
            print("❌ Deleted invoice should return 404")
            return False
        else:
            print("✅ Draft invoice successfully deleted")
        
        # Verify stock restoration
        _, updated_product = self.run_test(
            "Get Updated Product Stock After Deletion",
            "GET",
            f"/api/produits/{self.test_product.get('id')}",
            200,
            print_response=False
        )
        
        updated_stock = updated_product.get('stock_actuel', 0)
        print(f"📦 Stock after deletion: {updated_stock}")
        
        if updated_stock == initial_stock:
            print("✅ Stock correctly restored after deletion")
        else:
            print(f"❌ Stock not restored correctly. Expected: {initial_stock}, Got: {updated_stock}")
            return False
        
        # Test 2: Delete a cancelled invoice
        print("\n🔍 Test 2: Delete a cancelled invoice")
        cancelled_invoice = self.create_test_invoice("brouillon")
        if not cancelled_invoice:
            print("❌ Failed to create invoice for cancellation")
            return False
        
        # First cancel it
        self.run_test(
            "Cancel Invoice Before Deletion",
            "POST",
            f"/api/factures/{cancelled_invoice.get('id')}/annuler",
            200,
            data={"motif": "Cancel before deletion test"},
            print_response=False
        )
        
        # Then delete it
        success, _ = self.run_test(
            "Delete Cancelled Invoice",
            "DELETE",
            f"/api/factures/{cancelled_invoice.get('id')}",
            200,
            data={"motif": "Test deletion of cancelled invoice"}
        )
        
        if not success:
            print("❌ Failed to delete cancelled invoice")
            return False
        else:
            print("✅ Cancelled invoice successfully deleted")
        
        # Test 3: Try to delete a paid invoice (should fail)
        print("\n🔍 Test 3: Try to delete a paid invoice")
        paid_invoice = self.create_test_invoice("payee")
        if not paid_invoice:
            print("❌ Failed to create paid invoice")
            return False
        
        success, _ = self.run_test(
            "Delete Paid Invoice",
            "DELETE",
            f"/api/factures/{paid_invoice.get('id')}",
            400,  # Should fail
            data={"motif": "Test deletion of paid invoice"},
            print_response=False
        )
        
        if success:
            print("❌ Should not be able to delete a paid invoice")
            return False
        else:
            print("✅ Correctly prevented deletion of paid invoice")
        
        # Test 4: Try to delete without motif (should fail)
        print("\n🔍 Test 4: Try to delete without motif")
        another_draft = self.create_test_invoice("brouillon")
        if not another_draft:
            print("❌ Failed to create another draft invoice")
            return False
        
        success, _ = self.run_test(
            "Delete Without Motif",
            "DELETE",
            f"/api/factures/{another_draft.get('id')}",
            400,  # Should fail
            data={},  # No motif
            print_response=False
        )
        
        if success:
            print("❌ Should not be able to delete without motif")
            return False
        else:
            print("✅ Correctly required motif for deletion")
        
        return True

    def test_stock_control_enhancement(self):
        """Test enhanced stock control during invoice creation"""
        print("\n" + "=" * 60)
        print("📦 TESTING ENHANCED STOCK CONTROL")
        print("=" * 60)
        
        # Authenticate as admin
        auth_success, _ = self.authenticate("admin@facturapp.rdc", "admin123")
        if not auth_success:
            print("❌ Failed to authenticate as admin")
            return False
        
        if not self.setup_test_data():
            return False
        
        # Get current stock
        _, product = self.run_test(
            "Get Current Product Stock",
            "GET",
            f"/api/produits/{self.test_product.get('id')}",
            200,
            print_response=False
        )
        
        current_stock = product.get('stock_actuel', 0)
        print(f"📦 Current stock: {current_stock}")
        
        # Test 1: Try to create invoice with quantity > stock
        print("\n🔍 Test 1: Try to create invoice with insufficient stock")
        
        excessive_quantity = current_stock + 10
        prix_usd = float(self.test_product.get('prix_usd', 100))
        prix_fc = prix_usd * 2800
        tva = float(self.test_product.get('tva', 16.0))
        
        total_ht_usd = prix_usd * excessive_quantity
        total_ht_fc = prix_fc * excessive_quantity
        total_tva_usd = total_ht_usd * (tva/100)
        total_tva_fc = total_ht_fc * (tva/100)
        total_ttc_usd = total_ht_usd + total_tva_usd
        total_ttc_fc = total_ht_fc + total_tva_fc
        
        invoice_data = {
            "client_id": self.test_client.get('id'),
            "client_nom": self.test_client.get('nom'),
            "client_email": self.test_client.get('email'),
            "client_adresse": f"{self.test_client.get('adresse')}, {self.test_client.get('ville')} {self.test_client.get('code_postal')}",
            "devise": "USD",
            "lignes": [
                {
                    "produit_id": self.test_product.get('id'),
                    "nom_produit": self.test_product.get('nom'),
                    "quantite": excessive_quantity,
                    "prix_unitaire_usd": prix_usd,
                    "prix_unitaire_fc": prix_fc,
                    "devise": "USD",
                    "tva": tva,
                    "total_ht_usd": total_ht_usd,
                    "total_ht_fc": total_ht_fc,
                    "total_ttc_usd": total_ttc_usd,
                    "total_ttc_fc": total_ttc_fc
                }
            ],
            "total_ht_usd": total_ht_usd,
            "total_ht_fc": total_ht_fc,
            "total_tva_usd": total_tva_usd,
            "total_tva_fc": total_tva_fc,
            "total_ttc_usd": total_ttc_usd,
            "total_ttc_fc": total_ttc_fc,
            "notes": "Test invoice with insufficient stock"
        }
        
        success, response = self.run_test(
            "Create Invoice with Insufficient Stock",
            "POST",
            "/api/factures",
            400,  # Should fail
            data=invoice_data
        )
        
        if success:
            print("❌ Should not be able to create invoice with insufficient stock")
            return False
        else:
            print("✅ Correctly prevented invoice creation with insufficient stock")
            # Check if error message is explicit
            if response and "Stock insuffisant" in str(response):
                print("✅ Error message is explicit about insufficient stock")
            else:
                print("⚠️ Error message could be more explicit")
        
        # Test 2: Create invoice with valid quantity
        print("\n🔍 Test 2: Create invoice with valid stock quantity")
        
        valid_quantity = min(5, current_stock - 1)  # Safe quantity
        
        total_ht_usd = prix_usd * valid_quantity
        total_ht_fc = prix_fc * valid_quantity
        total_tva_usd = total_ht_usd * (tva/100)
        total_tva_fc = total_ht_fc * (tva/100)
        total_ttc_usd = total_ht_usd + total_tva_usd
        total_ttc_fc = total_ht_fc + total_tva_fc
        
        valid_invoice_data = {
            "client_id": self.test_client.get('id'),
            "client_nom": self.test_client.get('nom'),
            "client_email": self.test_client.get('email'),
            "client_adresse": f"{self.test_client.get('adresse')}, {self.test_client.get('ville')} {self.test_client.get('code_postal')}",
            "devise": "USD",
            "lignes": [
                {
                    "produit_id": self.test_product.get('id'),
                    "nom_produit": self.test_product.get('nom'),
                    "quantite": valid_quantity,
                    "prix_unitaire_usd": prix_usd,
                    "prix_unitaire_fc": prix_fc,
                    "devise": "USD",
                    "tva": tva,
                    "total_ht_usd": total_ht_usd,
                    "total_ht_fc": total_ht_fc,
                    "total_ttc_usd": total_ttc_usd,
                    "total_ttc_fc": total_ttc_fc
                }
            ],
            "total_ht_usd": total_ht_usd,
            "total_ht_fc": total_ht_fc,
            "total_tva_usd": total_tva_usd,
            "total_tva_fc": total_tva_fc,
            "total_ttc_usd": total_ttc_usd,
            "total_ttc_fc": total_ttc_fc,
            "notes": "Test invoice with valid stock quantity"
        }
        
        success, valid_invoice = self.run_test(
            "Create Invoice with Valid Stock",
            "POST",
            "/api/factures",
            200,
            data=valid_invoice_data,
            print_response=False
        )
        
        if not success:
            print("❌ Failed to create invoice with valid stock quantity")
            return False
        else:
            print("✅ Successfully created invoice with valid stock quantity")
        
        # Verify stock was reduced
        _, updated_product = self.run_test(
            "Get Updated Product Stock",
            "GET",
            f"/api/produits/{self.test_product.get('id')}",
            200,
            print_response=False
        )
        
        new_stock = updated_product.get('stock_actuel', 0)
        expected_stock = current_stock - valid_quantity
        
        if new_stock == expected_stock:
            print(f"✅ Stock correctly reduced: {current_stock} → {new_stock}")
        else:
            print(f"❌ Stock not reduced correctly. Expected: {expected_stock}, Got: {new_stock}")
            return False
        
        return True

    def run_all_tests(self):
        """Run all Phase 2 tests"""
        print("\n" + "=" * 80)
        print("🚀 STARTING PHASE 2 INVOICE MANAGEMENT TESTS")
        print("=" * 80)
        
        start_time = datetime.now()
        
        # Test 1: Permissions
        permissions_ok = self.test_permissions()
        
        # Test 2: Invoice Cancellation
        cancellation_ok = self.test_invoice_cancellation()
        
        # Test 3: Invoice Deletion
        deletion_ok = self.test_invoice_deletion()
        
        # Test 4: Enhanced Stock Control
        stock_control_ok = self.test_stock_control_enhancement()
        
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()
        
        # Summary
        print("\n" + "=" * 80)
        print("📋 PHASE 2 TESTING SUMMARY")
        print("=" * 80)
        
        print(f"⏱️ Total testing time: {duration:.2f} seconds")
        print(f"🔍 Total tests run: {self.tests_run}")
        print(f"✅ Tests passed: {self.tests_passed}")
        print(f"❌ Tests failed: {self.tests_run - self.tests_passed}")
        print(f"📊 Success rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        print("\n📋 Feature Test Results:")
        print(f"🔐 Permissions: {'✅ PASSED' if permissions_ok else '❌ FAILED'}")
        print(f"🚫 Invoice Cancellation: {'✅ PASSED' if cancellation_ok else '❌ FAILED'}")
        print(f"🗑️ Invoice Deletion: {'✅ PASSED' if deletion_ok else '❌ FAILED'}")
        print(f"📦 Enhanced Stock Control: {'✅ PASSED' if stock_control_ok else '❌ FAILED'}")
        
        all_passed = permissions_ok and cancellation_ok and deletion_ok and stock_control_ok
        
        if all_passed:
            print("\n🎉 ALL PHASE 2 FEATURES ARE WORKING CORRECTLY!")
        else:
            print("\n⚠️ SOME PHASE 2 FEATURES HAVE ISSUES")
        
        return all_passed

def main():
    """Main function to run Phase 2 tests"""
    tester = Phase2InvoiceManagementTester()
    
    print("🔧 Phase 2 Invoice Management Testing Tool")
    print("Testing new features: Cancellation, Deletion, and Enhanced Stock Control")
    
    # Run all tests
    success = tester.run_all_tests()
    
    if success:
        print("\n✅ All Phase 2 features are working correctly!")
        sys.exit(0)
    else:
        print("\n❌ Some Phase 2 features have issues that need attention")
        sys.exit(1)

if __name__ == "__main__":
    main()