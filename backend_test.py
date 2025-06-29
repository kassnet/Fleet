import requests
import sys
import json
from datetime import datetime

class FactureProTester:
    def __init__(self, base_url="https://d0039ec8-c9dc-4dc2-9cb3-2161d015d481.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.test_client = None
        self.test_product = None
        self.test_invoice = None
        self.test_payment = None

    def run_test(self, name, method, endpoint, expected_status=200, data=None, print_response=True):
        """Run a single API test"""
        url = f"{self.base_url}{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
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

    def test_health(self):
        """Test the health endpoint"""
        success, data = self.run_test("Health Check", "GET", "/api/health")
        if success:
            print(f"🏥 Health status: {data.get('status')}")
        return success

    def test_stats(self):
        """Test the stats endpoint"""
        success, data = self.run_test("Stats", "GET", "/api/stats")
        if success:
            print(f"📈 Total clients: {data.get('total_clients')}")
            print(f"📦 Total products: {data.get('total_produits')}")
            print(f"📄 Total invoices: {data.get('total_factures')}")
            print(f"💰 Monthly revenue (USD): {data.get('ca_mensuel_usd')}")
            print(f"💱 Exchange rate: {data.get('taux_change_actuel')} FC/USD")
        return success

    def test_clients(self):
        """Test the clients endpoint"""
        success, data = self.run_test("Clients List", "GET", "/api/clients")
        if success:
            print(f"👥 Number of clients: {len(data)}")
            for client in data[:2]:  # Show only first 2 clients
                print(f"  - {client.get('nom')} ({client.get('email')})")
        return success
    
    def test_create_client(self):
        """Test creating a new client"""
        timestamp = datetime.now().strftime('%H%M%S')
        client_data = {
            "nom": f"Test Client {timestamp}",
            "email": f"test{timestamp}@example.com",
            "telephone": "+243 81 234 5678",
            "adresse": "Avenue Test 123",
            "ville": "Kinshasa",
            "code_postal": "12345",
            "pays": "RDC",
            "devise_preferee": "USD"
        }
        
        success, response = self.run_test(
            "Create Client",
            "POST",
            "/api/clients",
            200,
            data=client_data
        )
        
        if success:
            self.test_client = response
            print(f"Created test client with ID: {response.get('id')}")
            return True
        return False

    def test_update_client(self):
        """Test updating an existing client"""
        if not self.test_client:
            print("❌ No test client available to update")
            return False
        
        client_id = self.test_client.get('id')
        updated_data = self.test_client.copy()
        updated_data["telephone"] = "+243 99 876 5432"
        updated_data["ville"] = "Lubumbashi"
        
        success, response = self.run_test(
            "Update Client",
            "PUT",
            f"/api/clients/{client_id}",
            200,
            data=updated_data
        )
        
        if success:
            self.test_client = response
            return True
        return False

    def test_produits(self):
        """Test the products endpoint"""
        success, data = self.run_test("Products List", "GET", "/api/produits")
        if success:
            print(f"📦 Number of products: {len(data)}")
            for produit in data[:2]:  # Show only first 2 products
                print(f"  - {produit.get('nom')} (${produit.get('prix_usd')} USD / {produit.get('prix_fc')} FC)")
                if produit.get('gestion_stock'):
                    print(f"    Stock: {produit.get('stock_actuel')} / {produit.get('stock_maximum')}")
        return success
    
    def test_create_product(self):
        """Test creating a new product with stock management"""
        timestamp = datetime.now().strftime('%H%M%S')
        product_data = {
            "nom": f"Test Product {timestamp}",
            "description": "Product for testing",
            "prix_usd": 100.0,
            "unite": "unité",
            "tva": 16.0,
            "actif": True,
            "gestion_stock": True,
            "stock_actuel": 50,
            "stock_minimum": 10,
            "stock_maximum": 100
        }
        
        success, response = self.run_test(
            "Create Product",
            "POST",
            "/api/produits",
            200,
            data=product_data
        )
        
        if success:
            self.test_product = response
            print(f"Created test product with ID: {response.get('id')}")
            return True
        return False

    def test_update_product_stock(self):
        """Test updating stock for a product"""
        if not self.test_product:
            print("❌ No test product available to update stock")
            return False
        
        product_id = self.test_product.get('id')
        stock_data = {
            "nouvelle_quantite": 75,
            "motif": "Test stock update"
        }
        
        success, response = self.run_test(
            "Update Product Stock",
            "PUT",
            f"/api/produits/{product_id}/stock",
            200,
            data=stock_data
        )
        
        if success:
            # Check stock movements
            self.run_test(
                "Get Stock Movements",
                "GET",
                f"/api/produits/{product_id}/mouvements",
                200
            )
            return True
        return False

    def test_factures(self):
        """Test the invoices endpoint"""
        success, data = self.run_test("Invoices List", "GET", "/api/factures")
        if success:
            print(f"📄 Number of invoices: {len(data)}")
            for facture in data[:2]:  # Show only first 2 invoices
                print(f"  - {facture.get('numero')} - Client: {facture.get('client_nom')} - Status: {facture.get('statut')}")
                print(f"    Amount: ${facture.get('total_ttc_usd')} USD / {facture.get('total_ttc_fc')} FC")
        return success
    
    def test_create_invoice(self):
        """Test creating a new invoice"""
        if not self.test_client or not self.test_product:
            print("❌ Need both test client and product to create invoice")
            return False
        
        # Calculate prices
        prix_usd = float(self.test_product.get('prix_usd', 100))
        prix_fc = float(self.test_product.get('prix_fc', prix_usd * 2800))
        quantite = 2
        tva = float(self.test_product.get('tva', 16.0))
        
        total_ht_usd = prix_usd * quantite
        total_ht_fc = prix_fc * quantite
        total_ttc_usd = total_ht_usd * (1 + tva/100)
        total_ttc_fc = total_ht_fc * (1 + tva/100)
        
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
            "total_tva_usd": total_ht_usd * tva/100,
            "total_tva_fc": total_ht_fc * tva/100,
            "total_ttc_usd": total_ttc_usd,
            "total_ttc_fc": total_ttc_fc,
            "notes": "Test invoice"
        }
        
        success, response = self.run_test(
            "Create Invoice",
            "POST",
            "/api/factures",
            200,
            data=invoice_data
        )
        
        if success:
            self.test_invoice = response
            print(f"Created test invoice with ID: {response.get('id')}")
            return True
        return False

    def test_send_invoice(self):
        """Test sending an invoice"""
        if not self.test_invoice:
            print("❌ No test invoice available to send")
            return False
        
        invoice_id = self.test_invoice.get('id')
        
        success, response = self.run_test(
            "Send Invoice",
            "POST",
            f"/api/factures/{invoice_id}/envoyer",
            200
        )
        
        if success:
            # Get updated invoice
            _, updated_invoice = self.run_test(
                "Get Updated Invoice",
                "GET",
                f"/api/factures/{invoice_id}",
                200
            )
            if updated_invoice:
                self.test_invoice = updated_invoice
            return True
        return False

    def test_paiements(self):
        """Test the payments endpoint"""
        success, data = self.run_test("Payments List", "GET", "/api/paiements")
        if success:
            print(f"💳 Number of payments: {len(data)}")
            for paiement in data[:2]:  # Show only first 2 payments
                print(f"  - Invoice: {paiement.get('facture_numero')} - Status: {paiement.get('statut')}")
                print(f"    Amount: ${paiement.get('montant_usd')} USD / {paiement.get('montant_fc')} FC")
        return success
    
    def test_simulate_payment(self):
        """Test simulating a payment"""
        if not self.test_invoice:
            print("❌ No test invoice available for payment")
            return False
        
        invoice_id = self.test_invoice.get('id')
        print(f"🔍 Testing payment simulation for invoice ID: {invoice_id}")
        
        payment_data = {
            "facture_id": invoice_id,
            "devise_paiement": "USD"
        }
        
        success, response = self.run_test(
            "Simulate Payment",
            "POST",
            "/api/paiements/simulate",
            200,
            data=payment_data
        )
        
        if success:
            self.test_payment = response
            payment_id = response.get('paiement_id')
            print(f"✅ Payment simulation successful - Payment ID: {payment_id}")
            print(f"💳 Transaction ID: {response.get('transaction_id')}")
            
            # Validate payment
            if payment_id:
                pay_success, _ = self.run_test(
                    "Mark Invoice as Paid",
                    "POST",
                    f"/api/factures/{invoice_id}/payer",
                    200,
                    data={"paiement_id": payment_id}
                )
                if pay_success:
                    print("✅ Invoice marked as paid successfully")
                else:
                    print("❌ Failed to mark invoice as paid")
            
            # Check invoice status
            _, updated_invoice = self.run_test(
                "Check Invoice Status After Payment",
                "GET",
                f"/api/factures/{invoice_id}",
                200
            )
            
            if updated_invoice:
                self.test_invoice = updated_invoice
                print(f"📄 Invoice status after payment: {updated_invoice.get('statut')}")
                
            return True
        else:
            print("❌ Payment simulation failed - Check if 'Facture non trouvée' error occurred")
            return False

    def test_taux_change(self):
        """Test the exchange rate endpoint"""
        success, data = self.run_test("Exchange Rate", "GET", "/api/taux-change")
        if success:
            print(f"💱 Exchange rate: {data.get('taux')} {data.get('devise_cible')}/{data.get('devise_base')}")
        return success

def main():
    # Setup
    tester = FactureProTester()
    
    print("=" * 50)
    print("🧪 TESTING FACTUREPRO RDC API")
    print("=" * 50)
    
    # Run tests
    health_ok = tester.test_health()
    if not health_ok:
        print("❌ Health check failed, stopping tests")
        return 1
    
    # Basic GET tests
    tester.test_stats()
    tester.test_clients()
    tester.test_produits()
    tester.test_factures()
    tester.test_paiements()
    tester.test_taux_change()
    
    # CRUD tests
    print("\n" + "=" * 50)
    print("🔄 TESTING CRUD OPERATIONS")
    print("=" * 50)
    
    # Client CRUD
    client_created = tester.test_create_client()
    if client_created:
        tester.test_update_client()
    
    # Product CRUD
    product_created = tester.test_create_product()
    if product_created:
        tester.test_update_product_stock()
    
    # Invoice and Payment flow
    if client_created and product_created:
        invoice_created = tester.test_create_invoice()
        if invoice_created:
            tester.test_send_invoice()
            tester.test_simulate_payment()
    
    # Test specific payment endpoints with existing invoices
    print("\n" + "=" * 50)
    print("🔍 TESTING SPECIFIC PAYMENT ENDPOINTS")
    print("=" * 50)
    
    # Get an existing invoice to test with
    _, invoices = tester.run_test("Get Existing Invoices", "GET", "/api/factures", print_response=False)
    if invoices and len(invoices) > 0:
        # Find an invoice with status "envoyee"
        sent_invoice = next((inv for inv in invoices if inv.get('statut') == 'envoyee'), None)
        if sent_invoice:
            invoice_id = sent_invoice.get('id')
            print(f"🧾 Testing with existing invoice: {sent_invoice.get('numero')} (ID: {invoice_id})")
            
            # Test direct payment simulation
            payment_data = {
                "facture_id": invoice_id,
                "devise_paiement": "USD"
            }
            
            success, response = tester.run_test(
                "Direct Payment Simulation",
                "POST",
                "/api/paiements/simulate",
                200,
                data=payment_data
            )
            
            if success and response:
                payment_id = response.get('paiement_id')
                print(f"✅ Direct payment simulation successful - Payment ID: {payment_id}")
                
                # Test marking as paid
                tester.run_test(
                    "Mark Invoice as Paid Directly",
                    "POST",
                    f"/api/factures/{invoice_id}/payer",
                    200,
                    data={"paiement_id": payment_id}
                )
    
    # Print results
    print("\n" + "=" * 50)
    print(f"📊 Tests passed: {tester.tests_passed}/{tester.tests_run}")
    print("=" * 50)
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())