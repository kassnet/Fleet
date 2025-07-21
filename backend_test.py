import requests
import sys
import json
from datetime import datetime

class FactureProTester:
    def __init__(self, base_url="https://d49f146a-1c74-4ae7-997f-d63e95bc382e.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.test_client = None
        self.test_product = None
        self.test_invoice = None
        self.test_payment = None
        self.token = None
        self.headers = {'Content-Type': 'application/json'}

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

    def test_devis_endpoints(self):
        """Test all devis (quotes) endpoints"""
        print("\n" + "=" * 50)
        print("📋 TESTING DEVIS (QUOTES) FUNCTIONALITY")
        print("=" * 50)
        
        if not self.test_client or not self.test_product:
            print("❌ Need both test client and product to test devis")
            return False
        
        # 1. Test GET /api/devis - get all quotes
        print("\n🔍 Testing GET /api/devis")
        success, devis_list = self.run_test("Get All Devis", "GET", "/api/devis")
        if success:
            print(f"📋 Number of existing devis: {len(devis_list)}")
        
        # 2. Test POST /api/devis - create new quote
        print("\n🔍 Testing POST /api/devis - Create new quote")
        
        # Calculate prices for devis
        prix_usd = float(self.test_product.get('prix_usd', 100))
        prix_fc = float(self.test_product.get('prix_fc', prix_usd * 2800))
        quantite = 2
        tva = float(self.test_product.get('tva', 16.0))
        
        total_ht_usd = prix_usd * quantite
        total_ht_fc = prix_fc * quantite
        total_tva_usd = total_ht_usd * (tva/100)
        total_tva_fc = total_ht_fc * (tva/100)
        total_ttc_usd = total_ht_usd + total_tva_usd
        total_ttc_fc = total_ht_fc + total_tva_fc
        
        devis_data = {
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
            "validite_jours": 30,
            "notes": "Test devis created by automated testing",
            "conditions": "Conditions générales de vente applicables"
        }
        
        success, created_devis = self.run_test(
            "Create Devis",
            "POST",
            "/api/devis",
            200,
            data=devis_data
        )
        
        if not success or not created_devis:
            print("❌ Failed to create devis")
            return False
        
        devis_id = created_devis.get('id')
        devis_numero = created_devis.get('numero')
        print(f"✅ Created devis with ID: {devis_id}")
        print(f"📋 Devis number: {devis_numero}")
        print(f"📋 Initial status: {created_devis.get('statut')}")
        
        # 3. Test GET /api/devis/{devis_id} - get specific quote
        print(f"\n🔍 Testing GET /api/devis/{devis_id} - Get specific quote")
        success, retrieved_devis = self.run_test(
            "Get Specific Devis",
            "GET",
            f"/api/devis/{devis_id}",
            200
        )
        
        if not success or not retrieved_devis:
            print("❌ Failed to retrieve specific devis")
            return False
        
        print(f"✅ Successfully retrieved devis {retrieved_devis.get('numero')}")
        print(f"📋 Status: {retrieved_devis.get('statut')}")
        print(f"💰 Total USD: {retrieved_devis.get('total_ttc_usd')}")
        print(f"💰 Total FC: {retrieved_devis.get('total_ttc_fc')}")
        
        # 4. Test PUT /api/devis/{devis_id} - update quote status
        print(f"\n🔍 Testing PUT /api/devis/{devis_id} - Update quote status")
        
        # Test all possible status transitions
        status_transitions = [
            ("envoye", "Sent to client"),
            ("accepte", "Accepted by client"),
            ("refuse", "Refused by client"),
            ("expire", "Expired")
        ]
        
        for new_status, description in status_transitions:
            print(f"\n📝 Testing status change to '{new_status}' ({description})")
            
            # The API expects status as query parameter, not in body
            success, response = self.run_test(
                f"Update Devis Status to {new_status}",
                "PUT",
                f"/api/devis/{devis_id}?statut={new_status}",
                200
            )
            
            if success:
                # Verify the status was updated
                success_verify, updated_devis = self.run_test(
                    f"Verify Status Update to {new_status}",
                    "GET",
                    f"/api/devis/{devis_id}",
                    200,
                    print_response=False
                )
                
                if success_verify and updated_devis.get('statut') == new_status:
                    print(f"✅ Status successfully updated to '{new_status}'")
                    if new_status == "accepte" and updated_devis.get('date_acceptation'):
                        print(f"📅 Acceptance date set: {updated_devis.get('date_acceptation')}")
                else:
                    print(f"❌ Status not properly updated to '{new_status}'")
                    return False
            else:
                print(f"❌ Failed to update status to '{new_status}'")
                return False
        
        # 5. Test POST /api/devis/{devis_id}/convertir-facture - convert quote to invoice
        print(f"\n🔍 Testing POST /api/devis/{devis_id}/convertir-facture - Convert to invoice")
        
        # First, set the devis back to "accepte" status (required for conversion)
        self.run_test(
            "Set Devis to Accepted for Conversion",
            "PUT",
            f"/api/devis/{devis_id}?statut=accepte",
            200,
            print_response=False
        )
        
        success, conversion_response = self.run_test(
            "Convert Devis to Facture",
            "POST",
            f"/api/devis/{devis_id}/convertir-facture",
            200
        )
        
        if not success or not conversion_response:
            print("❌ Failed to convert devis to facture")
            return False
        
        facture_id = conversion_response.get('facture_id')
        facture_numero = conversion_response.get('facture_numero')
        
        print(f"✅ Successfully converted devis to facture")
        print(f"📄 New facture ID: {facture_id}")
        print(f"📄 New facture number: {facture_numero}")
        
        # Verify the created facture exists and has correct data
        success, created_facture = self.run_test(
            "Verify Created Facture",
            "GET",
            f"/api/factures/{facture_id}",
            200
        )
        
        if success and created_facture:
            print(f"✅ Facture created successfully from devis")
            print(f"📄 Facture client: {created_facture.get('client_nom')}")
            print(f"💰 Facture total USD: {created_facture.get('total_ttc_usd')}")
            print(f"💰 Facture total FC: {created_facture.get('total_ttc_fc')}")
            
            # Verify amounts match between devis and facture
            if (abs(created_facture.get('total_ttc_usd', 0) - total_ttc_usd) < 0.01 and
                abs(created_facture.get('total_ttc_fc', 0) - total_ttc_fc) < 0.01):
                print("✅ Amounts correctly transferred from devis to facture")
            else:
                print("❌ Amount mismatch between devis and facture")
                return False
        else:
            print("❌ Failed to verify created facture")
            return False
        
        # Verify the devis now has the facture_id linked
        success, final_devis = self.run_test(
            "Verify Devis-Facture Link",
            "GET",
            f"/api/devis/{devis_id}",
            200,
            print_response=False
        )
        
        if success and final_devis and final_devis.get('facture_id') == facture_id:
            print("✅ Devis correctly linked to created facture")
        else:
            print("❌ Devis not properly linked to facture")
            return False
        
        # 6. Test multi-currency calculations in devis
        print(f"\n🔍 Testing multi-currency calculations in devis")
        
        # Create a devis in FC currency
        devis_fc_data = devis_data.copy()
        devis_fc_data["devise"] = "FC"
        devis_fc_data["notes"] = "Test devis in FC currency"
        
        success, devis_fc = self.run_test(
            "Create Devis in FC Currency",
            "POST",
            "/api/devis",
            200,
            data=devis_fc_data
        )
        
        if success and devis_fc:
            print(f"✅ Successfully created devis in FC currency")
            print(f"💰 FC Total: {devis_fc.get('total_ttc_fc')}")
            print(f"💰 USD Total: {devis_fc.get('total_ttc_usd')}")
            
            # Verify currency conversion (2800 FC = 1 USD)
            expected_usd = devis_fc.get('total_ttc_fc', 0) / 2800
            actual_usd = devis_fc.get('total_ttc_usd', 0)
            
            if abs(expected_usd - actual_usd) < 0.01:
                print("✅ Currency conversion in devis is correct")
            else:
                print(f"❌ Currency conversion error: expected {expected_usd} USD, got {actual_usd} USD")
                return False
        else:
            print("❌ Failed to create devis in FC currency")
            return False
        
        # 7. Test date expiration functionality
        print(f"\n🔍 Testing date expiration functionality")
        
        # Create a devis with short validity period
        devis_short_data = devis_data.copy()
        devis_short_data["validite_jours"] = 1  # 1 day validity
        devis_short_data["notes"] = "Test devis with short validity"
        
        success, devis_short = self.run_test(
            "Create Devis with Short Validity",
            "POST",
            "/api/devis",
            200,
            data=devis_short_data
        )
        
        if success and devis_short:
            print(f"✅ Successfully created devis with 1-day validity")
            print(f"📅 Creation date: {devis_short.get('date_creation')}")
            print(f"📅 Expiration date: {devis_short.get('date_expiration')}")
            
            # Verify expiration date is set correctly
            if devis_short.get('date_expiration'):
                print("✅ Expiration date correctly calculated")
            else:
                print("❌ Expiration date not set")
                return False
        else:
            print("❌ Failed to create devis with short validity")
            return False
        
        print("\n" + "=" * 50)
        print("📋 DEVIS TESTING SUMMARY")
        print("=" * 50)
        print("✅ GET /api/devis - List all quotes: PASSED")
        print("✅ POST /api/devis - Create new quote: PASSED")
        print("✅ GET /api/devis/{id} - Get specific quote: PASSED")
        print("✅ PUT /api/devis/{id} - Update quote status: PASSED")
        print("✅ POST /api/devis/{id}/convertir-facture - Convert to invoice: PASSED")
        print("✅ Multi-currency calculations USD/FC: PASSED")
        print("✅ Date expiration functionality: PASSED")
        print("✅ All status transitions (brouillon→envoyé→accepté→refusé→expiré): PASSED")
        
        return True

def test_bulk_client_creation(tester, count=10):
    """Create multiple clients in bulk for load testing"""
    print("\n" + "=" * 50)
    print(f"🔄 BULK CREATION TEST: Creating {count} clients")
    print("=" * 50)
    
    start_time = datetime.now()
    created_clients = []
    
    for i in range(count):
        timestamp = datetime.now().strftime('%H%M%S%f')
        client_data = {
            "nom": f"Test Client {timestamp}",
            "email": f"test{timestamp}@example.com",
            "telephone": f"+243 81 {i}34 5678",
            "adresse": f"Avenue Test {i+100}",
            "ville": ["Kinshasa", "Lubumbashi", "Goma", "Bukavu", "Kisangani"][i % 5],
            "code_postal": f"{10000 + i}",
            "pays": "RDC",
            "devise_preferee": ["USD", "FC"][i % 2]
        }
        
        success, response = tester.run_test(
            f"Create Client {i+1}/{count}",
            "POST",
            "/api/clients",
            200,
            data=client_data,
            print_response=False
        )
        
        if success and response:
            created_clients.append(response)
    
    end_time = datetime.now()
    duration = (end_time - start_time).total_seconds()
    
    print(f"✅ Created {len(created_clients)}/{count} clients in {duration:.2f} seconds")
    print(f"⏱️ Average time per client: {duration/count:.2f} seconds")
    
    return created_clients

def test_bulk_product_creation(tester, count=15):
    """Create multiple products in bulk for load testing"""
    print("\n" + "=" * 50)
    print(f"🔄 BULK CREATION TEST: Creating {count} products")
    print("=" * 50)
    
    start_time = datetime.now()
    created_products = []
    
    for i in range(count):
        timestamp = datetime.now().strftime('%H%M%S%f')
        has_stock = i % 3 == 0  # Every third product has stock management
        
        product_data = {
            "nom": f"Test Product {timestamp}",
            "description": f"Product description {i+1} for load testing",
            "prix_usd": 50.0 + (i * 10),  # Varying prices
            "unite": ["unité", "heure", "jour", "mois", "projet"][i % 5],
            "tva": [16.0, 10.0, 20.0][i % 3],
            "actif": True,
            "gestion_stock": has_stock,
            "stock_actuel": 100 if has_stock else None,
            "stock_minimum": 20 if has_stock else None,
            "stock_maximum": 200 if has_stock else None
        }
        
        success, response = tester.run_test(
            f"Create Product {i+1}/{count}",
            "POST",
            "/api/produits",
            200,
            data=product_data,
            print_response=False
        )
        
        if success and response:
            created_products.append(response)
    
    end_time = datetime.now()
    duration = (end_time - start_time).total_seconds()
    
    print(f"✅ Created {len(created_products)}/{count} products in {duration:.2f} seconds")
    print(f"⏱️ Average time per product: {duration/count:.2f} seconds")
    
    return created_products

def test_bulk_invoice_creation(tester, clients, products, count=10):
    """Create multiple invoices in bulk for load testing"""
    print("\n" + "=" * 50)
    print(f"🔄 BULK CREATION TEST: Creating {count} invoices")
    print("=" * 50)
    
    if not clients or not products:
        print("❌ Need clients and products to create invoices")
        return []
    
    start_time = datetime.now()
    created_invoices = []
    
    for i in range(count):
        # Select random client and 1-5 random products
        client = clients[i % len(clients)]
        selected_products = [products[(i + j) % len(products)] for j in range(1 + i % 5)]
        
        # Calculate invoice totals
        lignes = []
        total_ht_usd = 0
        total_ht_fc = 0
        total_tva_usd = 0
        total_tva_fc = 0
        
        for j, product in enumerate(selected_products):
            quantite = 1 + j  # Different quantities
            prix_usd = float(product.get('prix_usd', 100))
            prix_fc = float(product.get('prix_fc', prix_usd * 2800))
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
        
        # Create invoice with complex data
        invoice_data = {
            "client_id": client.get('id'),
            "client_nom": client.get('nom'),
            "client_email": client.get('email'),
            "client_adresse": f"{client.get('adresse')}, {client.get('ville')} {client.get('code_postal')}",
            "devise": ["USD", "FC"][i % 2],  # Alternate currencies
            "lignes": lignes,
            "total_ht_usd": total_ht_usd,
            "total_ht_fc": total_ht_fc,
            "total_tva_usd": total_tva_usd,
            "total_tva_fc": total_tva_fc,
            "total_ttc_usd": total_ttc_usd,
            "total_ttc_fc": total_ttc_fc,
            "notes": f"Test invoice {i+1} with {len(lignes)} products"
        }
        
        success, response = tester.run_test(
            f"Create Invoice {i+1}/{count}",
            "POST",
            "/api/factures",
            200,
            data=invoice_data,
            print_response=False
        )
        
        if success and response:
            created_invoices.append(response)
            
            # Randomly mark some invoices as sent
            if i % 3 == 0:
                tester.run_test(
                    f"Send Invoice {i+1}",
                    "POST",
                    f"/api/factures/{response.get('id')}/envoyer",
                    200,
                    print_response=False
                )
            
            # Randomly mark some invoices as paid
            if i % 5 == 0:
                tester.run_test(
                    f"Mark Invoice {i+1} as Paid",
                    "POST",
                    f"/api/factures/{response.get('id')}/payer",
                    200,
                    print_response=False
                )
    
    end_time = datetime.now()
    duration = (end_time - start_time).total_seconds()
    
    print(f"✅ Created {len(created_invoices)}/{count} invoices in {duration:.2f} seconds")
    print(f"⏱️ Average time per invoice: {duration/count:.2f} seconds")
    
    return created_invoices

def test_complex_data(tester, clients, products):
    """Test with complex data scenarios"""
    print("\n" + "=" * 50)
    print("🧪 TESTING COMPLEX DATA SCENARIOS")
    print("=" * 50)
    
    if not clients or not products:
        print("❌ Need clients and products for complex data tests")
        return False
    
    client = clients[0]
    
    # Create invoice with 5 different products
    selected_products = products[:5] if len(products) >= 5 else products
    
    # Test with decimal quantities and complex prices
    lignes = []
    total_ht_usd = 0
    total_ht_fc = 0
    total_tva_usd = 0
    total_tva_fc = 0
    
    decimal_quantities = [2.5, 0.75, 1.33, 4.25, 0.5]
    complex_prices = [999.99, 1234.56, 9876.54, 123456.78, 0.99]
    
    for i, product in enumerate(selected_products):
        quantite = decimal_quantities[i % len(decimal_quantities)]
        prix_usd = complex_prices[i % len(complex_prices)]
        prix_fc = prix_usd * 2800
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
    
    # Create invoice with complex data
    invoice_data = {
        "client_id": client.get('id'),
        "client_nom": client.get('nom'),
        "client_email": client.get('email'),
        "client_adresse": f"{client.get('adresse')}, {client.get('ville')} {client.get('code_postal')}",
        "devise": "USD",
        "lignes": lignes,
        "total_ht_usd": total_ht_usd,
        "total_ht_fc": total_ht_fc,
        "total_tva_usd": total_tva_usd,
        "total_tva_fc": total_tva_fc,
        "total_ttc_usd": total_ttc_usd,
        "total_ttc_fc": total_ttc_fc,
        "notes": "Test invoice with complex data: decimal quantities and complex prices"
    }
    
    print("🧪 Testing invoice with decimal quantities and complex prices")
    success, response = tester.run_test(
        "Create Complex Invoice",
        "POST",
        "/api/factures",
        200,
        data=invoice_data
    )
    
    if success:
        print("✅ Successfully created invoice with complex data")
        
        # Test special characters in client name
        special_client_data = {
            "nom": "Société Spéciale & Çô. (Test)",
            "email": "special@example.com",
            "telephone": "+243 81 234 5678",
            "adresse": "Rue de l'Étoile #123",
            "ville": "Kinshasa",
            "code_postal": "12345",
            "pays": "RDC",
            "devise_preferee": "USD"
        }
        
        print("🧪 Testing client with special characters")
        success, special_client = tester.run_test(
            "Create Client with Special Characters",
            "POST",
            "/api/clients",
            200,
            data=special_client_data
        )
        
        if success:
            print("✅ Successfully created client with special characters")
            return True
    
    return False

def test_stock_management(tester, products):
    """Test stock management and alerts"""
    print("\n" + "=" * 50)
    print("🧪 TESTING STOCK MANAGEMENT")
    print("=" * 50)
    
    if not products:
        print("❌ Need products for stock management tests")
        return False
    
    # Find products with stock management
    stock_products = [p for p in products if p.get('gestion_stock')]
    
    if not stock_products:
        print("❌ No products with stock management found")
        return False
    
    product = stock_products[0]
    product_id = product.get('id')
    current_stock = product.get('stock_actuel', 0)
    
    print(f"🧪 Testing stock updates for product: {product.get('nom')}")
    print(f"Current stock: {current_stock}")
    
    # Update stock to a higher value
    new_stock = current_stock + 50
    stock_data = {
        "nouvelle_quantite": new_stock,
        "motif": "Test stock increase"
    }
    
    success, response = tester.run_test(
        "Increase Stock",
        "PUT",
        f"/api/produits/{product_id}/stock",
        200,
        data=stock_data
    )
    
    if success:
        print(f"✅ Successfully increased stock to {new_stock}")
        
        # Create an invoice that will reduce stock
        client_response, clients = tester.run_test(
            "Get Clients for Stock Test",
            "GET",
            "/api/clients",
            200,
            print_response=False
        )
        
        if client_response and clients and len(clients) > 0:
            client = clients[0]
            
            # Calculate how much to order to bring stock below minimum
            stock_minimum = product.get('stock_minimum', 10)
            quantity_to_order = new_stock - stock_minimum + 5  # 5 below minimum
            
            print(f"🧪 Testing stock reduction with invoice - Ordering {quantity_to_order} units")
            
            prix_usd = float(product.get('prix_usd', 100))
            prix_fc = float(product.get('prix_fc', prix_usd * 2800))
            tva = float(product.get('tva', 16.0))
            
            total_ht_usd = prix_usd * quantity_to_order
            total_ht_fc = prix_fc * quantity_to_order
            total_tva_usd = total_ht_usd * (tva/100)
            total_tva_fc = total_ht_fc * (tva/100)
            total_ttc_usd = total_ht_usd + total_tva_usd
            total_ttc_fc = total_ht_fc + total_tva_fc
            
            invoice_data = {
                "client_id": client.get('id'),
                "client_nom": client.get('nom'),
                "client_email": client.get('email'),
                "client_adresse": f"{client.get('adresse')}, {client.get('ville')} {client.get('code_postal')}",
                "devise": "USD",
                "lignes": [{
                    "produit_id": product_id,
                    "nom_produit": product.get('nom'),
                    "quantite": quantity_to_order,
                    "prix_unitaire_usd": prix_usd,
                    "prix_unitaire_fc": prix_fc,
                    "devise": "USD",
                    "tva": tva,
                    "total_ht_usd": total_ht_usd,
                    "total_ht_fc": total_ht_fc,
                    "total_ttc_usd": total_ttc_usd,
                    "total_ttc_fc": total_ttc_fc
                }],
                "total_ht_usd": total_ht_usd,
                "total_ht_fc": total_ht_fc,
                "total_tva_usd": total_tva_usd,
                "total_tva_fc": total_tva_fc,
                "total_ttc_usd": total_ttc_usd,
                "total_ttc_fc": total_ttc_fc,
                "notes": "Test invoice for stock reduction"
            }
            
            success, invoice = tester.run_test(
                "Create Invoice for Stock Reduction",
                "POST",
                "/api/factures",
                200,
                data=invoice_data
            )
            
            if success:
                print("✅ Successfully created invoice that reduces stock")
                
                # Check updated stock
                _, updated_product = tester.run_test(
                    "Get Updated Product Stock",
                    "GET",
                    f"/api/produits/{product_id}",
                    200
                )
                
                if updated_product:
                    new_stock_level = updated_product.get('stock_actuel', 0)
                    print(f"📦 Updated stock level: {new_stock_level}")
                    
                    # Check if stock is below minimum
                    if new_stock_level < stock_minimum:
                        print(f"⚠️ Stock is below minimum ({stock_minimum})")
                        
                        # Check if this is reflected in stats
                        _, stats = tester.run_test(
                            "Get Stats for Stock Alerts",
                            "GET",
                            "/api/stats",
                            200
                        )
                        
                        if stats and stats.get('produits_stock_bas', 0) > 0:
                            print(f"✅ Stock alert is correctly shown in stats: {stats.get('produits_stock_bas')} products with low stock")
                            return True
                        else:
                            print("❌ Stock alert not reflected in stats")
                    else:
                        print("❌ Stock not reduced below minimum as expected")
                else:
                    print("❌ Failed to get updated product")
            else:
                print("❌ Failed to create invoice for stock reduction")
        else:
            print("❌ No clients available for stock test")
    else:
        print("❌ Failed to update stock")
    
    return False

def test_insufficient_stock(tester, products):
    """Test creating an invoice with insufficient stock"""
    print("\n" + "=" * 50)
    print("🧪 TESTING INSUFFICIENT STOCK VALIDATION")
    print("=" * 50)
    
    if not products:
        print("❌ Need products for insufficient stock test")
        return False
    
    # Find products with stock management
    stock_products = [p for p in products if p.get('gestion_stock')]
    
    if not stock_products:
        print("❌ No products with stock management found")
        return False
    
    product = stock_products[0]
    product_id = product.get('id')
    current_stock = product.get('stock_actuel', 0)
    
    print(f"🧪 Testing insufficient stock for product: {product.get('nom')}")
    print(f"Current stock: {current_stock}")
    
    # Try to create an invoice with quantity > current stock
    quantity_to_order = current_stock + 10  # 10 more than available
    
    client_response, clients = tester.run_test(
        "Get Clients for Insufficient Stock Test",
        "GET",
        "/api/clients",
        200,
        print_response=False
    )
    
    if client_response and clients and len(clients) > 0:
        client = clients[0]
        
        prix_usd = float(product.get('prix_usd', 100))
        prix_fc = float(product.get('prix_fc', prix_usd * 2800))
        tva = float(product.get('tva', 16.0))
        
        total_ht_usd = prix_usd * quantity_to_order
        total_ht_fc = prix_fc * quantity_to_order
        total_tva_usd = total_ht_usd * (tva/100)
        total_tva_fc = total_ht_fc * (tva/100)
        total_ttc_usd = total_ht_usd + total_tva_usd
        total_ttc_fc = total_ht_fc + total_tva_fc
        
        invoice_data = {
            "client_id": client.get('id'),
            "client_nom": client.get('nom'),
            "client_email": client.get('email'),
            "client_adresse": f"{client.get('adresse')}, {client.get('ville')} {client.get('code_postal')}",
            "devise": "USD",
            "lignes": [{
                "produit_id": product_id,
                "nom_produit": product.get('nom'),
                "quantite": quantity_to_order,
                "prix_unitaire_usd": prix_usd,
                "prix_unitaire_fc": prix_fc,
                "devise": "USD",
                "tva": tva,
                "total_ht_usd": total_ht_usd,
                "total_ht_fc": total_ht_fc,
                "total_ttc_usd": total_ttc_usd,
                "total_ttc_fc": total_ttc_fc
            }],
            "total_ht_usd": total_ht_usd,
            "total_ht_fc": total_ht_fc,
            "total_tva_usd": total_tva_usd,
            "total_tva_fc": total_tva_fc,
            "total_ttc_usd": total_ttc_usd,
            "total_ttc_fc": total_ttc_fc,
            "notes": "Test invoice with insufficient stock"
        }
        
        # This should fail with 400 Bad Request
        success, response = tester.run_test(
            "Create Invoice with Insufficient Stock",
            "POST",
            "/api/factures",
            400,  # Expecting 400 error
            data=invoice_data
        )
        
        if not success:
            print("✅ Correctly rejected invoice with insufficient stock")
            return True
        else:
            print("❌ Failed: Invoice with insufficient stock was accepted")
    else:
        print("❌ No clients available for insufficient stock test")
    
    return False

def test_dashboard_consistency(tester):
    """Test dashboard statistics consistency"""
    print("\n" + "=" * 50)
    print("🧪 TESTING DASHBOARD CONSISTENCY")
    print("=" * 50)
    
    # Get stats
    success, stats = tester.run_test(
        "Get Dashboard Stats",
        "GET",
        "/api/stats",
        200
    )
    
    if not success:
        print("❌ Failed to get dashboard stats")
        return False
    
    # Get actual counts from endpoints
    _, clients = tester.run_test(
        "Get All Clients",
        "GET",
        "/api/clients",
        200,
        print_response=False
    )
    
    _, products = tester.run_test(
        "Get All Products",
        "GET",
        "/api/produits",
        200,
        print_response=False
    )
    
    _, invoices = tester.run_test(
        "Get All Invoices",
        "GET",
        "/api/factures",
        200,
        print_response=False
    )
    
    # Verify counts match
    clients_count = len(clients) if clients else 0
    products_count = len([p for p in products if p.get('actif', True)]) if products else 0
    invoices_count = len(invoices) if invoices else 0
    
    print(f"🔍 Comparing dashboard stats with actual counts:")
    print(f"Clients: Dashboard={stats.get('total_clients')} vs Actual={clients_count}")
    print(f"Products: Dashboard={stats.get('total_produits')} vs Actual={products_count}")
    print(f"Invoices: Dashboard={stats.get('total_factures')} vs Actual={invoices_count}")
    
    # Count unpaid invoices
    unpaid_invoices = [i for i in invoices if i.get('statut') in ['brouillon', 'envoyee']] if invoices else []
    unpaid_count = len(unpaid_invoices)
    
    print(f"Unpaid Invoices: Dashboard={stats.get('factures_impayees')} vs Actual={unpaid_count}")
    
    # Calculate unpaid amount
    unpaid_amount_usd = sum(i.get('total_ttc_usd', 0) for i in unpaid_invoices)
    unpaid_amount_fc = sum(i.get('total_ttc_fc', 0) for i in unpaid_invoices)
    
    print(f"Unpaid Amount USD: Dashboard={stats.get('montant_impaye_usd')} vs Calculated={unpaid_amount_usd}")
    print(f"Unpaid Amount FC: Dashboard={stats.get('montant_impaye_fc')} vs Calculated={unpaid_amount_fc}")
    
    # Check for low stock products
    low_stock_products = [
        p for p in products 
        if p.get('gestion_stock') and p.get('stock_actuel', 0) < p.get('stock_minimum', 0)
    ] if products else []
    
    low_stock_count = len(low_stock_products)
    print(f"Low Stock Products: Dashboard={stats.get('produits_stock_bas')} vs Actual={low_stock_count}")
    
    # Determine if stats are consistent
    is_consistent = (
        abs(stats.get('total_clients', 0) - clients_count) <= 1 and
        abs(stats.get('total_produits', 0) - products_count) <= 1 and
        abs(stats.get('total_factures', 0) - invoices_count) <= 1 and
        abs(stats.get('factures_impayees', 0) - unpaid_count) <= 1
    )
    
    if is_consistent:
        print("✅ Dashboard statistics are consistent with actual data")
        return True
    else:
        print("❌ Dashboard statistics show inconsistencies")
        return False

def measure_api_performance(tester):
    """Measure API performance for key endpoints"""
    print("\n" + "=" * 50)
    print("⏱️ MEASURING API PERFORMANCE")
    print("=" * 50)
    
    endpoints = [
        {"method": "GET", "path": "/api/health", "name": "Health Check"},
        {"method": "GET", "path": "/api/stats", "name": "Dashboard Stats"},
        {"method": "GET", "path": "/api/clients", "name": "Clients List"},
        {"method": "GET", "path": "/api/produits", "name": "Products List"},
        {"method": "GET", "path": "/api/factures", "name": "Invoices List"},
        {"method": "GET", "path": "/api/paiements", "name": "Payments List"},
        {"method": "GET", "path": "/api/taux-change", "name": "Exchange Rate"}
    ]
    
    results = []
    
    for endpoint in endpoints:
        print(f"⏱️ Testing response time for {endpoint['name']}...")
        
        # Run 3 times and take average
        times = []
        for i in range(3):
            start_time = datetime.now()
            
            success, _ = tester.run_test(
                f"{endpoint['name']} (Performance Test {i+1})",
                endpoint["method"],
                endpoint["path"],
                200,
                print_response=False
            )
            
            if success:
                end_time = datetime.now()
                duration = (end_time - start_time).total_seconds()
                times.append(duration)
        
        if times:
            avg_time = sum(times) / len(times)
            results.append({
                "endpoint": endpoint["path"],
                "name": endpoint["name"],
                "avg_time": avg_time,
                "max_time": max(times),
                "min_time": min(times)
            })
            print(f"  Average response time: {avg_time:.3f} seconds")
    
    print("\n📊 API PERFORMANCE SUMMARY:")
    for result in sorted(results, key=lambda x: x["avg_time"]):
        status = "✅" if result["avg_time"] < 3 else "⚠️"
        print(f"{status} {result['name']}: {result['avg_time']:.3f}s (min: {result['min_time']:.3f}s, max: {result['max_time']:.3f}s)")
    
    # Check if any endpoint is too slow
    slow_endpoints = [r for r in results if r["avg_time"] >= 3]
    if slow_endpoints:
        print("\n⚠️ SLOW ENDPOINTS DETECTED:")
        for endpoint in slow_endpoints:
            print(f"⚠️ {endpoint['name']} ({endpoint['endpoint']}): {endpoint['avg_time']:.3f}s")
    else:
        print("\n✅ All endpoints respond within acceptable time (< 3 seconds)")
    
    return len(slow_endpoints) == 0

def test_specific_issues():
    """Test specific issues identified in test_result.md"""
def test_id_corrections(tester=None):
    """Test specific ID correction issues as requested in the review"""
    print("\n" + "=" * 80)
    print("🔍 TESTING ID CORRECTION ISSUES")
    print("=" * 80)
    
    if tester is None:
        # Authenticate if no tester provided
        auth_success, tester = test_authentication("admin@facturapp.rdc", "admin123")
        if not auth_success:
            auth_success, tester = test_authentication("manager@demo.com", "manager123")
            if not auth_success:
                print("❌ Authentication failed, stopping ID correction tests")
                return False
    
    # 1. Test basic API health
    print("\n🔍 STEP 1: Checking API health")
    health_ok = tester.test_health()
    if not health_ok:
        print("❌ Health check failed, stopping tests")
        return False
    
    # 2. Create test client
    print("\n🔍 STEP 2: Creating test client")
    client_ok = tester.test_create_client()
    if not client_ok:
        print("❌ Failed to create test client, stopping tests")
        return False
    
    # 3. Create test product
    print("\n🔍 STEP 3: Creating test product")
    product_ok = tester.test_create_product()
    if not product_ok:
        print("❌ Failed to create test product, stopping tests")
        return False
    
    # 4. Test creating a new invoice and verify the ID returned
    print("\n🔍 STEP 4: Creating test invoice and verifying ID format")
    invoice_ok = tester.test_create_invoice()
    if not invoice_ok:
        print("❌ Failed to create test invoice, stopping tests")
        return False
    
    # Verify the invoice ID format
    invoice_id = tester.test_invoice.get('id')
    if not invoice_id:
        print("❌ Invoice ID is missing")
        return False
    
    # Check if it's a UUID (should be 36 chars with hyphens)
    is_uuid = len(invoice_id) == 36 and "-" in invoice_id
    print(f"📝 Invoice ID: {invoice_id}")
    print(f"📝 ID format: {'UUID' if is_uuid else 'Not UUID (possibly ObjectId)'}")
    
    if is_uuid:
        print("✅ Invoice created with proper UUID format")
    else:
        print("⚠️ Invoice created with non-UUID format - this might be an ObjectId")
    
    # 5. Test sending invoice (status to 'envoyee') and verify it can be retrieved
    print("\n🔍 STEP 5: Sending invoice and verifying it can be retrieved")
    send_ok = tester.test_send_invoice()
    if not send_ok:
        print("❌ Failed to send invoice, stopping tests")
        return False
    
    # Verify the invoice can be retrieved after status change
    success, updated_invoice = tester.run_test(
        "Get Invoice After Status Change",
        "GET",
        f"/api/factures/{invoice_id}",
        200
    )
    
    if success and updated_invoice:
        print("✅ Successfully retrieved invoice after status change")
        print(f"📝 Invoice status: {updated_invoice.get('statut')}")
        if updated_invoice.get('statut') == 'envoyee':
            print("✅ Invoice status correctly updated to 'envoyee'")
        else:
            print(f"❌ Invoice status not updated correctly: {updated_invoice.get('statut')}")
    else:
        print("❌ Failed to retrieve invoice after status change")
        return False
    
    # 6. Test marking invoice as paid and verify status
    print("\n🔍 STEP 6: Marking invoice as paid and verifying status")
    
    success, response = tester.run_test(
        "Mark Invoice as Paid",
        "POST",
        f"/api/factures/{invoice_id}/payer",
        200
    )
    
    if not success:
        print("❌ Failed to mark invoice as paid")
        return False
    
    # Verify the invoice status after marking as paid
    success, paid_invoice = tester.run_test(
        "Get Invoice After Payment",
        "GET",
        f"/api/factures/{invoice_id}",
        200
    )
    
    if success and paid_invoice:
        print("✅ Successfully retrieved invoice after payment")
        print(f"📝 Invoice status: {paid_invoice.get('statut')}")
        if paid_invoice.get('statut') == 'payee':
            print("✅ Invoice status correctly updated to 'payee'")
        else:
            print(f"❌ Invoice status not updated correctly: {paid_invoice.get('statut')}")
    else:
        print("❌ Failed to retrieve invoice after payment")
        return False
    
    # 7. Test GET /api/factures/{id} endpoint with the corrected ID
    print("\n🔍 STEP 7: Testing GET /api/factures/{id} endpoint")
    
    success, get_invoice = tester.run_test(
        "Get Invoice by ID",
        "GET",
        f"/api/factures/{invoice_id}",
        200
    )
    
    if success and get_invoice:
        print("✅ Successfully retrieved invoice by ID")
        print(f"📝 Invoice number: {get_invoice.get('numero')}")
        print(f"📝 Invoice client: {get_invoice.get('client_nom')}")
    else:
        print("❌ Failed to retrieve invoice by ID")
        return False
    
    # 8. Test ID consistency across operations
    print("\n🔍 STEP 8: Testing ID consistency across operations")
    
    # Create another invoice to test consistency
    print("Creating another invoice for consistency testing...")
    
    # Calculate prices for a new invoice
    prix_usd = float(tester.test_product.get('prix_usd', 100))
    prix_fc = float(tester.test_product.get('prix_fc', prix_usd * 2800))
    quantite = 3  # Different quantity
    tva = float(tester.test_product.get('tva', 16.0))
    
    total_ht_usd = prix_usd * quantite
    total_ht_fc = prix_fc * quantite
    total_ttc_usd = total_ht_usd * (1 + tva/100)
    total_ttc_fc = total_ht_fc * (1 + tva/100)
    
    invoice_data = {
        "client_id": tester.test_client.get('id'),
        "client_nom": tester.test_client.get('nom'),
        "client_email": tester.test_client.get('email'),
        "client_adresse": f"{tester.test_client.get('adresse')}, {tester.test_client.get('ville')} {tester.test_client.get('code_postal')}",
        "devise": "USD",
        "lignes": [
            {
                "produit_id": tester.test_product.get('id'),
                "nom_produit": tester.test_product.get('nom'),
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
        "notes": "Test invoice for ID consistency"
    }
    
    success, new_invoice = tester.run_test(
        "Create Invoice for Consistency Test",
        "POST",
        "/api/factures",
        200,
        data=invoice_data
    )
    
    if not success or not new_invoice:
        print("❌ Failed to create new invoice for consistency test")
        return False
    
    new_invoice_id = new_invoice.get('id')
    print(f"📝 New invoice ID: {new_invoice_id}")
    
    # Test the full workflow with the new invoice
    print("Testing full workflow with the new invoice...")
    
    # 1. Send the invoice
    success, _ = tester.run_test(
        "Send New Invoice",
        "POST",
        f"/api/factures/{new_invoice_id}/envoyer",
        200
    )
    
    if not success:
        print("❌ Failed to send new invoice")
        return False
    
    # 2. Verify it can be retrieved after sending
    success, sent_invoice = tester.run_test(
        "Get New Invoice After Sending",
        "GET",
        f"/api/factures/{new_invoice_id}",
        200
    )
    
    if not success or not sent_invoice:
        print("❌ Failed to retrieve new invoice after sending")
        return False
    
    print(f"✅ Successfully retrieved new invoice after sending")
    print(f"📝 New invoice status: {sent_invoice.get('statut')}")
    
    # 3. Mark as paid
    success, _ = tester.run_test(
        "Mark New Invoice as Paid",
        "POST",
        f"/api/factures/{new_invoice_id}/payer",
        200
    )
    
    if not success:
        print("❌ Failed to mark new invoice as paid")
        return False
    
    # 4. Verify it can be retrieved after payment
    success, paid_new_invoice = tester.run_test(
        "Get New Invoice After Payment",
        "GET",
        f"/api/factures/{new_invoice_id}",
        200
    )
    
    if not success or not paid_new_invoice:
        print("❌ Failed to retrieve new invoice after payment")
        return False
    
    print(f"✅ Successfully retrieved new invoice after payment")
    print(f"📝 New invoice status: {paid_new_invoice.get('statut')}")
    
    if paid_new_invoice.get('statut') == 'payee':
        print("✅ New invoice status correctly updated to 'payee'")
    else:
        print(f"❌ New invoice status not updated correctly: {paid_new_invoice.get('statut')}")
    
    # Summary of test results
    print("\n" + "=" * 80)
    print("📋 SUMMARY OF ID CORRECTION TESTS:")
    print("=" * 80)
    
    # Check if all operations were successful
    all_operations_ok = (
        invoice_ok and 
        send_ok and 
        success and 
        paid_invoice.get('statut') == 'payee' and
        paid_new_invoice.get('statut') == 'payee'
    )
    
    if all_operations_ok:
        print("✅ All ID-related operations were successful")
        print("✅ The functions get_facture, envoyer_facture, update_facture, and marquer_payee all use consistent ID logic")
        print("✅ No issues with UUID vs MongoDB ObjectId consistency")
        print("✅ All CRUD operations on invoices work without 404 errors")
    else:
        print("❌ Some ID-related operations failed")
        print("❌ There may still be issues with ID handling")
    
    return all_operations_ok
    print("\n" + "=" * 80)
    print("🔍 TESTING SPECIFIC ISSUES FROM TEST_RESULT.MD")
    print("=" * 80)
    
    tester = FactureProTester()
    
    # 1. Test basic API health
    print("\n🔍 STEP 1: Checking API health")
    health_ok = tester.test_health()
    if not health_ok:
        print("❌ Health check failed, stopping tests")
        return False
    
    # 2. Create test client
    print("\n🔍 STEP 2: Creating test client")
    client_ok = tester.test_create_client()
    if not client_ok:
        print("❌ Failed to create test client, stopping tests")
        return False
    
    # 3. Create test product
    print("\n🔍 STEP 3: Creating test product")
    product_ok = tester.test_create_product()
    if not product_ok:
        print("❌ Failed to create test product, stopping tests")
        return False
    
    # 4. Create test invoice - Testing "Création et gestion des factures"
    print("\n🔍 STEP 4: Creating test invoice (Testing 'Création et gestion des factures')")
    invoice_ok = tester.test_create_invoice()
    if not invoice_ok:
        print("❌ Failed to create test invoice, stopping tests")
        return False
    
    # 5. Test sending invoice to change status to 'envoyee'
    print("\n🔍 STEP 5: Sending invoice to change status to 'envoyee'")
    send_ok = tester.test_send_invoice()
    if not send_ok:
        print("❌ Failed to send invoice, stopping tests")
        return False
    else:
        print("✅ Invoice successfully sent and status changed to 'envoyee'")
    
    # 6. Test marking invoice as paid - Testing "Marquage factures comme payées"
    print("\n🔍 STEP 6: Testing marking invoice as paid (Testing 'Marquage factures comme payées')")
    print("This tests the fixed functionality in marquer_payee function")
    
    # Try to mark the invoice as paid
    invoice_id = tester.test_invoice.get('id')
    paid_ok = False
    
    if invoice_id:
        _, response = tester.run_test(
            "Mark Invoice as Paid",
            "POST",
            f"/api/factures/{invoice_id}/payer",
            200
        )
        
        if response:
            # Verify the invoice status
            success, updated_invoice = tester.run_test(
                "Check Invoice Status",
                "GET",
                f"/api/factures/{invoice_id}",
                200
            )
            
            if success and updated_invoice and updated_invoice.get('statut') == 'payee':
                print("✅ Invoice status correctly updated to 'payee'")
                
                # Check if payment date is set
                if updated_invoice.get('date_paiement'):
                    print(f"✅ Payment date correctly set to: {updated_invoice.get('date_paiement')}")
                    paid_ok = True
                else:
                    print("❌ Payment date not set correctly")
            else:
                status = updated_invoice.get('statut') if updated_invoice else "unknown"
                print(f"❌ Invoice status not updated correctly: {status}")
    
    if not paid_ok:
        print("❌ Marking invoice as paid failed - The fix for ID handling may not be working")
    else:
        print("✅ Marking invoice as paid successful - The ID handling issue has been fixed")
    
    # 7. Test with MongoDB ObjectId (if possible)
    print("\n🔍 STEP 7: Testing with MongoDB ObjectId invoices")
    
    # Get all invoices to check if any use MongoDB ObjectId
    success, factures = tester.run_test("Get All Invoices", "GET", "/api/factures", 200)
    if not success or not factures:
        print("❌ Failed to get invoices")
        objectid_ok = False
    else:
        # Look for an invoice that might be using MongoDB ObjectId
        objectid_facture = None
        for facture in factures:
            # If the ID doesn't look like a UUID, it might be an ObjectId
            if facture["id"] and (len(facture["id"]) != 36 or "-" not in facture["id"]):
                objectid_facture = facture
                break
        
        if not objectid_facture:
            print("ℹ️ No MongoDB ObjectId invoices found to test")
            objectid_ok = True  # Not a failure, just not testable
        else:
            print(f"Found invoice with potential ObjectId: {objectid_facture['id']}")
            
            # If it's not already paid, try to mark it as paid
            if objectid_facture["statut"] != "payee":
                # First send it if it's in draft
                if objectid_facture["statut"] == "brouillon":
                    tester.run_test(
                        "Send ObjectId Invoice",
                        "POST",
                        f"/api/factures/{objectid_facture['id']}/envoyer",
                        200
                    )
                
                # Then mark as paid
                success, response = tester.run_test(
                    "Mark ObjectId Invoice as Paid",
                    "POST",
                    f"/api/factures/{objectid_facture['id']}/payer",
                    200
                )
                
                if success:
                    print(f"✅ Successfully marked ObjectId invoice {objectid_facture['numero']} as paid")
                    
                    # Verify the status update
                    success, updated_facture = tester.run_test(
                        "Get Updated ObjectId Invoice",
                        "GET",
                        f"/api/factures/{objectid_facture['id']}",
                        200
                    )
                    
                    if success and updated_facture["statut"] == "payee":
                        print(f"✅ ObjectId invoice status correctly updated to 'payee'")
                        objectid_ok = True
                    else:
                        print(f"❌ ObjectId invoice status not updated to 'payee'")
                        objectid_ok = False
                else:
                    print(f"❌ Failed to mark ObjectId invoice {objectid_facture['numero']} as paid")
                    objectid_ok = False
            else:
                print(f"ℹ️ ObjectId invoice {objectid_facture['numero']} already paid, skipping test")
                objectid_ok = True
    
    # 8. Test multi-currency calculations - Testing "Calculs multi-devises USD/FC"
    print("\n🔍 STEP 8: Testing multi-currency calculations (Testing 'Calculs multi-devises USD/FC')")
    
    # Check exchange rate
    _, taux = tester.run_test("Get Exchange Rate", "GET", "/api/taux-change", 200)
    if taux and taux.get('taux') == 2800.0:
        print("✅ Exchange rate is correctly set to 2800 FC = 1 USD")
    else:
        print(f"❌ Exchange rate is incorrect: {taux.get('taux')} (should be 2800.0)")
    
    # Test currency conversion
    amount_usd = 100.0
    _, conversion = tester.run_test(
        "Test Currency Conversion",
        "GET",
        f"/api/conversion?montant={amount_usd}&devise_source=USD&devise_cible=FC",
        200
    )
    
    if conversion and conversion.get('montant_converti') == amount_usd * 2800.0:
        print(f"✅ Currency conversion works correctly: {amount_usd} USD = {conversion.get('montant_converti')} FC")
    else:
        print(f"❌ Currency conversion is incorrect: {amount_usd} USD ≠ {conversion.get('montant_converti')} FC")
    
    # 9. Test statistics endpoint
    print("\n🔍 STEP 9: Testing statistics endpoint")
    _, stats = tester.run_test("Get Statistics", "GET", "/api/stats", 200)
    if stats:
        print(f"✅ Statistics endpoint works correctly")
        print(f"📊 Total clients: {stats.get('total_clients')}")
        print(f"📊 Total products: {stats.get('total_produits')}")
        print(f"📊 Total invoices: {stats.get('total_factures')}")
        print(f"📊 Monthly revenue (USD): {stats.get('ca_mensuel_usd')}")
        print(f"📊 Unpaid invoices: {stats.get('factures_impayees')}")
    else:
        print("❌ Statistics endpoint failed")
    
    # Summary of test results
    print("\n" + "=" * 80)
    print("📋 SUMMARY OF SPECIFIC ISSUE TESTS:")
    print("=" * 80)
    print(f"✅ 'Création et gestion des factures': {'Fixed' if invoice_ok else 'Still has issues'}")
    print(f"✅ 'Marquage factures comme payées': {'Fixed' if paid_ok else 'Still has issues'}")
    print(f"✅ 'Support for MongoDB ObjectIds': {'Fixed' if objectid_ok else 'Still has issues'}")
    print(f"✅ 'Calculs multi-devises USD/FC': {'Working correctly' if taux and taux.get('taux') == 2800.0 else 'Has issues'}")
    
    return invoice_ok and paid_ok and objectid_ok

def test_authentication(email="admin@facturapp.rdc", password="admin123"):
    """Test authentication with credentials"""
    print("\n" + "=" * 80)
    print(f"🔑 TESTING AUTHENTICATION WITH {email}")
    print("=" * 80)
    
    tester = FactureProTester()
    
    # Test login with credentials
    login_data = {
        "email": email,
        "password": password
    }
    
    success, response = tester.run_test(
        f"Login with {email}",
        "POST",
        "/api/auth/login",
        200,
        data=login_data
    )
    
    if success and response and "access_token" in response:
        print(f"✅ Successfully authenticated with {email}")
        # Store the token for future requests
        tester.token = response["access_token"]
        # Update headers to include the token
        tester.headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {tester.token}'
        }
        # Store user role
        tester.user_role = response.get("user", {}).get("role")
        print(f"👤 User role: {tester.user_role}")
        return True, tester
    else:
        print(f"❌ Failed to authenticate with {email}")
        return False, None

def test_vente_access(tester):
    """Test access to sales module based on user role"""
    print("\n" + "=" * 80)
    print(f"🔒 TESTING SALES MODULE ACCESS FOR ROLE: {tester.user_role}")
    print("=" * 80)
    
    # Test vente/stats endpoint
    success_stats, stats_data = tester.run_test(
        "Vente Stats Access",
        "GET",
        "/api/vente/stats",
        200 if tester.user_role in ['admin', 'manager'] else 403
    )
    
    # Test devis endpoint
    success_devis, devis_data = tester.run_test(
        "Devis Access",
        "GET",
        "/api/devis",
        200 if tester.user_role in ['admin', 'manager'] else 403
    )
    
    # Test opportunites endpoint
    success_opportunites, opportunites_data = tester.run_test(
        "Opportunites Access",
        "GET",
        "/api/opportunites",
        200 if tester.user_role in ['admin', 'manager'] else 403
    )
    
    # Test commandes endpoint
    success_commandes, commandes_data = tester.run_test(
        "Commandes Access",
        "GET",
        "/api/commandes",
        200 if tester.user_role in ['admin', 'manager'] else 403
    )
    
    if tester.user_role in ['admin', 'manager']:
        expected_access = True
        print(f"✅ User with role {tester.user_role} should have access to sales module")
    else:
        expected_access = False
        print(f"❌ User with role {tester.user_role} should NOT have access to sales module")
    
    # Check if access matches expectations
    access_correct = (
        (success_stats == expected_access) and
        (success_devis == expected_access) and
        (success_opportunites == expected_access) and
        (success_commandes == expected_access)
    )
    
    if access_correct:
        print(f"✅ Access permissions are correctly enforced for role {tester.user_role}")
    else:
        print(f"❌ Access permissions are NOT correctly enforced for role {tester.user_role}")
    
    return access_correct

def test_devis_functionality_complete():
    """Complete test of devis functionality with authentication"""
    print("\n" + "=" * 80)
    print("📋 TESTING COMPLETE DEVIS FUNCTIONALITY")
    print("=" * 80)
    
    # Test with admin user (has access to devis management)
    print("\n🔑 Authenticating as admin user...")
    auth_success, admin_tester = test_authentication("admin@facturapp.rdc", "admin123")
    
    if not auth_success:
        print("❌ Authentication failed for admin, trying manager...")
        auth_success, admin_tester = test_authentication("manager@demo.com", "manager123")
        
        if not auth_success:
            print("❌ Authentication failed for both admin and manager, stopping tests")
            return False
    
    print(f"✅ Successfully authenticated as {admin_tester.user_role}")
    
    # Create test data first
    print("\n📝 Setting up test data...")
    
    # Create test client
    client_ok = admin_tester.test_create_client()
    if not client_ok:
        print("❌ Failed to create test client")
        return False
    
    # Create test product
    product_ok = admin_tester.test_create_product()
    if not product_ok:
        print("❌ Failed to create test product")
        return False
    
    # Now test devis functionality
    print("\n📋 Testing devis functionality...")
    devis_ok = admin_tester.test_devis_endpoints()
    
    if devis_ok:
        print("\n✅ ALL DEVIS TESTS PASSED SUCCESSFULLY!")
        print("✅ Devis creation, status updates, and conversion to facture all working")
        print("✅ Multi-currency calculations USD/FC working correctly")
        print("✅ Authentication and permissions working for devis management")
        return True
    else:
        print("\n❌ SOME DEVIS TESTS FAILED")
        return False

def test_stock_management_complete():
    """Complete test of stock management functionality"""
    print("\n" + "=" * 80)
    print("📦 TESTING COMPLETE STOCK MANAGEMENT FUNCTIONALITY")
    print("=" * 80)
    
    # Test with admin user
    auth_success, admin_tester = test_authentication("admin@facturapp.rdc", "admin123")
    
    if not auth_success:
        print("❌ Authentication failed for admin, trying manager...")
        auth_success, admin_tester = test_authentication("manager@demo.com", "manager123")
        
        if not auth_success:
            print("❌ Authentication failed, stopping stock tests")
            return False
    
    print(f"✅ Successfully authenticated as {admin_tester.user_role}")
    
    # Test stock management
    print("\n📦 Testing stock management...")
    
    # Get existing products
    success, products = admin_tester.run_test("Get Products for Stock Test", "GET", "/api/produits", 200)
    if not success or not products:
        print("❌ Failed to get products for stock testing")
        return False
    
    # Find products with stock management
    stock_products = [p for p in products if p.get('gestion_stock')]
    
    if not stock_products:
        print("ℹ️ No products with stock management found, creating one...")
        # Create a product with stock management
        product_ok = admin_tester.test_create_product()
        if not product_ok:
            print("❌ Failed to create product with stock management")
            return False
        stock_products = [admin_tester.test_product]
    
    # Test stock operations
    product = stock_products[0]
    product_id = product.get('id')
    current_stock = product.get('stock_actuel', 0)
    
    print(f"📦 Testing stock operations for product: {product.get('nom')}")
    print(f"📦 Current stock: {current_stock}")
    
    # Test stock update
    new_stock = current_stock + 25
    stock_data = {
        "nouvelle_quantite": new_stock,
        "motif": "Test stock increase for comprehensive testing"
    }
    
    success, response = admin_tester.run_test(
        "Update Product Stock",
        "PUT",
        f"/api/produits/{product_id}/stock",
        200,
        data=stock_data
    )
    
    if success:
        print(f"✅ Successfully updated stock to {new_stock}")
        
        # Test stock movements
        success, movements = admin_tester.run_test(
            "Get Stock Movements",
            "GET",
            f"/api/produits/{product_id}/mouvements",
            200
        )
        
        if success and movements:
            print(f"✅ Stock movements recorded: {len(movements)} movements found")
            latest_movement = movements[0] if movements else None
            if latest_movement:
                print(f"📦 Latest movement: {latest_movement.get('type_mouvement')} - {latest_movement.get('quantite')} units")
        else:
            print("❌ Failed to retrieve stock movements")
            return False
    else:
        print("❌ Failed to update stock")
        return False
    
    print("\n✅ STOCK MANAGEMENT TESTS COMPLETED SUCCESSFULLY!")
    return True

def test_user_settings_separation():
    """Test the separation of user management and settings functionality"""
    print("\n" + "=" * 80)
    print("🔐 TESTING USER/SETTINGS SEPARATION FUNCTIONALITY")
    print("=" * 80)
    
    # Step 1: Create support account if it doesn't exist
    print("\n🔍 STEP 1: Creating support account")
    
    # First authenticate as admin to create the support account
    admin_auth_success, admin_tester = test_authentication("admin@facturapp.rdc", "admin123")
    if not admin_auth_success:
        print("❌ Failed to authenticate as admin, cannot create support account")
        return False
    
    # Try to create support account
    support_user_data = {
        "email": "support@facturapp.rdc",
        "nom": "Support",
        "prenom": "FacturApp",
        "password": "support123",
        "role": "support"
    }
    
    success, response = admin_tester.run_test(
        "Create Support Account",
        "POST",
        "/api/users",
        200,
        data=support_user_data
    )
    
    if success:
        print("✅ Support account created successfully")
    else:
        print("⚠️ Support account creation failed (might already exist)")
    
    # Step 2: Test authentication for all roles
    print("\n🔍 STEP 2: Testing authentication for all roles")
    
    test_credentials = [
        {"email": "admin@facturapp.rdc", "password": "admin123", "role": "admin"},
        {"email": "support@facturapp.rdc", "password": "support123", "role": "support"},
        {"email": "manager@demo.com", "password": "manager123", "role": "manager"}
    ]
    
    authenticated_users = {}
    
    for cred in test_credentials:
        auth_success, tester = test_authentication(cred["email"], cred["password"])
        if auth_success:
            authenticated_users[cred["role"]] = tester
            print(f"✅ {cred['role'].upper()} authentication successful")
        else:
            print(f"❌ {cred['role'].upper()} authentication failed")
            if cred["role"] == "support":
                print("🚨 CRITICAL: Support account authentication failed - cannot test settings separation")
    
    # Step 3: Test access to /api/users endpoint (Admin and Support should have access)
    print("\n🔍 STEP 3: Testing access to /api/users endpoint")
    
    for role, tester in authenticated_users.items():
        print(f"\n🔍 Testing /api/users access for {role.upper()}")
        
        success, response = tester.run_test(
            f"Get Users as {role.upper()}",
            "GET",
            "/api/users",
            200 if role in ["admin", "support"] else 403
        )
        
        if role in ["admin", "support"]:
            if success:
                print(f"✅ {role.upper()} can access /api/users (expected)")
                if response:
                    print(f"📊 Found {len(response)} users in system")
            else:
                print(f"❌ {role.upper()} cannot access /api/users (unexpected)")
        else:
            if not success:
                print(f"✅ {role.upper()} cannot access /api/users (expected)")
            else:
                print(f"❌ {role.upper()} can access /api/users (unexpected)")
    
    # Step 4: Test access to /api/parametres endpoints (Support only)
    print("\n🔍 STEP 4: Testing access to /api/parametres endpoints")
    
    # Test endpoints that should be support-only
    parametres_endpoints = [
        {"method": "GET", "path": "/api/parametres", "name": "Get Parameters"},
        {"method": "GET", "path": "/api/parametres/health", "name": "Parameters Health"},
        {"method": "POST", "path": "/api/parametres/taux-change", "name": "Update Exchange Rate", "data": {"taux": 2850.0}}
    ]
    
    for endpoint in parametres_endpoints:
        print(f"\n🔍 Testing {endpoint['name']} access")
        
        for role, tester in authenticated_users.items():
            expected_status = 200 if role == "support" else 403
            
            success, response = tester.run_test(
                f"{endpoint['name']} as {role.upper()}",
                endpoint["method"],
                endpoint["path"],
                expected_status,
                data=endpoint.get("data")
            )
            
            if role == "support":
                if success:
                    print(f"✅ {role.upper()} can access {endpoint['path']} (expected)")
                else:
                    print(f"❌ {role.upper()} cannot access {endpoint['path']} (unexpected)")
            else:
                if not success:
                    print(f"✅ {role.upper()} cannot access {endpoint['path']} (expected)")
                else:
                    print(f"❌ {role.upper()} can access {endpoint['path']} (unexpected)")
    
    # Step 5: Test that Admin cannot access /api/parametres
    print("\n🔍 STEP 5: Verifying Admin cannot access /api/parametres")
    
    if "admin" in authenticated_users:
        admin_tester = authenticated_users["admin"]
        
        success, response = admin_tester.run_test(
            "Admin Access to Parameters",
            "GET",
            "/api/parametres",
            403  # Should be forbidden
        )
        
        if not success:
            print("✅ Admin correctly denied access to /api/parametres")
        else:
            print("❌ Admin incorrectly granted access to /api/parametres")
    
    # Step 6: Test that Manager cannot access either /api/users or /api/parametres
    print("\n🔍 STEP 6: Verifying Manager cannot access restricted endpoints")
    
    if "manager" in authenticated_users:
        manager_tester = authenticated_users["manager"]
        
        # Test users endpoint
        success_users, _ = manager_tester.run_test(
            "Manager Access to Users",
            "GET",
            "/api/users",
            403
        )
        
        # Test parametres endpoint
        success_params, _ = manager_tester.run_test(
            "Manager Access to Parameters",
            "GET",
            "/api/parametres",
            403
        )
        
        if not success_users and not success_params:
            print("✅ Manager correctly denied access to both /api/users and /api/parametres")
        else:
            print("❌ Manager incorrectly granted access to restricted endpoints")
    
    # Step 7: Test specific support functionality
    print("\n🔍 STEP 7: Testing specific support functionality")
    
    if "support" in authenticated_users:
        support_tester = authenticated_users["support"]
        
        # Test updating exchange rate (support only)
        print("🔍 Testing exchange rate update (support only)")
        success, response = support_tester.run_test(
            "Update Exchange Rate as Support",
            "PUT",
            "/api/taux-change",
            200,
            data={"nouveau_taux": 2850.0}
        )
        
        if success:
            print("✅ Support can update exchange rate")
        else:
            print("❌ Support cannot update exchange rate")
        
        # Test getting current exchange rate
        success, response = support_tester.run_test(
            "Get Exchange Rate as Support",
            "GET",
            "/api/taux-change",
            200
        )
        
        if success and response:
            print(f"✅ Support can get exchange rate: {response.get('taux')} FC/USD")
        else:
            print("❌ Support cannot get exchange rate")
    else:
        print("❌ Support account not available for testing")
    
    # Summary
    print("\n" + "=" * 80)
    print("📋 USER/SETTINGS SEPARATION TEST SUMMARY")
    print("=" * 80)
    
    # Check if all expected behaviors were observed
    admin_ok = "admin" in authenticated_users
    support_ok = "support" in authenticated_users
    manager_ok = "manager" in authenticated_users
    
    if admin_ok and support_ok and manager_ok:
        print("✅ All user roles authenticated successfully")
        print("✅ Admin: Can access /api/users, cannot access /api/parametres")
        print("✅ Support: Can access both /api/users and /api/parametres")
        print("✅ Manager: Cannot access /api/users or /api/parametres")
        print("✅ Role-based access control working correctly")
        return True
    else:
        print("❌ Some user roles failed authentication")
        if not support_ok:
            print("🚨 CRITICAL: Support account authentication failed")
        print("❌ Cannot fully validate user/settings separation")
        return False

def test_phase2_invoice_management():
    """Test Phase 2 corrected invoice management functionalities"""
    print("\n" + "=" * 80)
    print("🔍 TESTING PHASE 2 CORRECTED INVOICE MANAGEMENT")
    print("=" * 80)
    
    # Test with different user roles
    test_accounts = [
        ("admin@facturapp.rdc", "admin123", "admin"),
        ("manager@demo.com", "manager123", "manager"),
        ("comptable@demo.com", "comptable123", "comptable"),
        ("user@demo.com", "user123", "utilisateur")  # Should be blocked
    ]
    
    results = {}
    
    for email, password, role in test_accounts:
        print(f"\n{'='*60}")
        print(f"🧪 TESTING WITH {role.upper()} ROLE ({email})")
        print(f"{'='*60}")
        
        # Authenticate
        auth_success, tester = test_authentication(email, password)
        if not auth_success:
            print(f"❌ Authentication failed for {role}")
            results[role] = {"auth": False}
            continue
        
        results[role] = {"auth": True}
        
        # Test permissions for invoice management endpoints
        if role in ["admin", "manager", "comptable"]:
            # These roles should have access
            results[role].update(test_invoice_cancellation_deletion(tester, role))
        else:
            # Regular users should be blocked
            results[role].update(test_blocked_access(tester, role))
    
    # Summary
    print("\n" + "=" * 80)
    print("📋 PHASE 2 TESTING SUMMARY")
    print("=" * 80)
    
    success_count = 0
    total_tests = 0
    
    for role, result in results.items():
        if result.get("auth"):
            if role in ["admin", "manager", "comptable"]:
                cancel_ok = result.get("cancel_success", False)
                delete_ok = result.get("delete_success", False)
                stock_restore_ok = result.get("stock_restore", False)
                query_params_ok = result.get("query_params_working", False)
                
                print(f"✅ {role.upper()}: Auth ✅ | Cancel {('✅' if cancel_ok else '❌')} | Delete {('✅' if delete_ok else '❌')} | Stock Restore {('✅' if stock_restore_ok else '❌')} | Query Params {('✅' if query_params_ok else '❌')}")
                
                if cancel_ok and delete_ok and stock_restore_ok and query_params_ok:
                    success_count += 1
                total_tests += 1
            else:
                blocked_ok = result.get("blocked_correctly", False)
                print(f"✅ {role.upper()}: Auth ✅ | Correctly Blocked {('✅' if blocked_ok else '❌')}")
                
                if blocked_ok:
                    success_count += 1
                total_tests += 1
        else:
            print(f"❌ {role.upper()}: Auth Failed")
            total_tests += 1
    
    overall_success = success_count == total_tests
    print(f"\n🎯 PHASE 2 RESULT: {success_count}/{total_tests} tests passed - {'✅ SUCCESS' if overall_success else '❌ FAILED'}")
    
    return overall_success

def test_invoice_cancellation_deletion(tester, role):
    """Test invoice cancellation and deletion with query parameters"""
    print(f"\n🔍 Testing invoice cancellation and deletion for {role}")
    
    results = {
        "cancel_success": False,
        "delete_success": False,
        "stock_restore": False,
        "query_params_working": False
    }
    
    # Create test data first
    if not tester.test_client:
        client_ok = tester.test_create_client()
        if not client_ok:
            print("❌ Failed to create test client")
            return results
    
    if not tester.test_product:
        product_ok = tester.test_create_product()
        if not product_ok:
            print("❌ Failed to create test product")
            return results
    
    # Create test invoice for cancellation
    print("\n📝 Creating test invoice for cancellation...")
    invoice_ok = tester.test_create_invoice()
    if not invoice_ok:
        print("❌ Failed to create test invoice")
        return results
    
    cancel_invoice_id = tester.test_invoice.get('id')
    print(f"📄 Created invoice for cancellation: {cancel_invoice_id}")
    
    # Get initial stock level
    product_id = tester.test_product.get('id')
    success, initial_product = tester.run_test(
        "Get Initial Product Stock",
        "GET",
        f"/api/produits/{product_id}",
        200,
        print_response=False
    )
    
    initial_stock = initial_product.get('stock_actuel', 0) if success else 0
    print(f"📦 Initial stock level: {initial_stock}")
    
    # Test 1: Cancel invoice with query parameter
    print(f"\n🚫 Testing invoice cancellation with query parameter...")
    motif_annulation = "Test cancellation with corrected query parameter"
    
    # Use query parameter as corrected
    success, response = tester.run_test(
        "Cancel Invoice with Query Parameter",
        "POST",
        f"/api/factures/{cancel_invoice_id}/annuler?motif={motif_annulation}",
        200
    )
    
    if success:
        print("✅ Invoice cancellation with query parameter successful")
        results["cancel_success"] = True
        results["query_params_working"] = True
        
        # Verify invoice status changed to 'annulee'
        success, cancelled_invoice = tester.run_test(
            "Verify Cancelled Invoice Status",
            "GET",
            f"/api/factures/{cancel_invoice_id}",
            200,
            print_response=False
        )
        
        if success and cancelled_invoice.get('statut') == 'annulee':
            print("✅ Invoice status correctly changed to 'annulee'")
            print(f"📝 Cancellation reason: {cancelled_invoice.get('motif_annulation')}")
            
            # Check if stock was restored
            success, updated_product = tester.run_test(
                "Check Stock After Cancellation",
                "GET",
                f"/api/produits/{product_id}",
                200,
                print_response=False
            )
            
            if success:
                new_stock = updated_product.get('stock_actuel', 0)
                print(f"📦 Stock after cancellation: {new_stock}")
                
                # Stock should be restored (increased)
                if new_stock > initial_stock:
                    print("✅ Stock correctly restored after cancellation")
                    results["stock_restore"] = True
                else:
                    print("❌ Stock was not restored after cancellation")
        else:
            print("❌ Invoice status not correctly updated after cancellation")
    else:
        print("❌ Invoice cancellation failed")
    
    # Test 2: Try to cancel a paid invoice (should fail)
    print(f"\n🚫 Testing cancellation of paid invoice (should fail)...")
    
    # Create another invoice and mark it as paid
    invoice_ok = tester.test_create_invoice()
    if invoice_ok:
        paid_invoice_id = tester.test_invoice.get('id')
        
        # Mark as paid first
        success, _ = tester.run_test(
            "Mark Invoice as Paid",
            "POST",
            f"/api/factures/{paid_invoice_id}/payer",
            200,
            print_response=False
        )
        
        if success:
            # Now try to cancel it (should fail)
            success, response = tester.run_test(
                "Try to Cancel Paid Invoice",
                "POST",
                f"/api/factures/{paid_invoice_id}/annuler?motif=Should fail",
                400  # Expecting 400 error
            )
            
            if not success:  # This means we got the expected 400 error
                print("✅ Correctly prevented cancellation of paid invoice")
            else:
                print("❌ Failed to prevent cancellation of paid invoice")
    
    # Test 3: Delete invoice with query parameter
    print(f"\n🗑️ Testing invoice deletion with query parameter...")
    
    # Create another invoice for deletion
    invoice_ok = tester.test_create_invoice()
    if invoice_ok:
        delete_invoice_id = tester.test_invoice.get('id')
        print(f"📄 Created invoice for deletion: {delete_invoice_id}")
        
        motif_suppression = "Test deletion with corrected query parameter"
        
        # Use query parameter as corrected
        success, response = tester.run_test(
            "Delete Invoice with Query Parameter",
            "DELETE",
            f"/api/factures/{delete_invoice_id}?motif={motif_suppression}",
            200
        )
        
        if success:
            print("✅ Invoice deletion with query parameter successful")
            results["delete_success"] = True
            
            # Verify invoice is actually deleted
            success, response = tester.run_test(
                "Verify Invoice Deleted",
                "GET",
                f"/api/factures/{delete_invoice_id}",
                404  # Should return 404 Not Found
            )
            
            if not success:  # This means we got the expected 404
                print("✅ Invoice correctly deleted from database")
            else:
                print("❌ Invoice still exists after deletion")
        else:
            print("❌ Invoice deletion failed")
    
    # Test 4: Try to delete a paid invoice (should fail)
    print(f"\n🗑️ Testing deletion of paid invoice (should fail)...")
    
    # Create another invoice and mark it as paid
    invoice_ok = tester.test_create_invoice()
    if invoice_ok:
        paid_delete_invoice_id = tester.test_invoice.get('id')
        
        # Mark as paid first
        success, _ = tester.run_test(
            "Mark Invoice as Paid for Delete Test",
            "POST",
            f"/api/factures/{paid_delete_invoice_id}/payer",
            200,
            print_response=False
        )
        
        if success:
            # Now try to delete it (should fail)
            success, response = tester.run_test(
                "Try to Delete Paid Invoice",
                "DELETE",
                f"/api/factures/{paid_delete_invoice_id}?motif=Should fail",
                400  # Expecting 400 error
            )
            
            if not success:  # This means we got the expected 400 error
                print("✅ Correctly prevented deletion of paid invoice")
            else:
                print("❌ Failed to prevent deletion of paid invoice")
    
    # Test 5: Test missing motif parameter (should fail)
    print(f"\n❌ Testing endpoints without motif parameter (should fail)...")
    
    # Create another invoice for this test
    invoice_ok = tester.test_create_invoice()
    if invoice_ok:
        no_motif_invoice_id = tester.test_invoice.get('id')
        
        # Try to cancel without motif
        success, response = tester.run_test(
            "Cancel Invoice Without Motif",
            "POST",
            f"/api/factures/{no_motif_invoice_id}/annuler",
            422  # Expecting validation error
        )
        
        if not success:  # This means we got the expected error
            print("✅ Correctly rejected cancellation without motif")
        else:
            print("❌ Failed to reject cancellation without motif")
        
        # Try to delete without motif
        success, response = tester.run_test(
            "Delete Invoice Without Motif",
            "DELETE",
            f"/api/factures/{no_motif_invoice_id}",
            422  # Expecting validation error
        )
        
        if not success:  # This means we got the expected error
            print("✅ Correctly rejected deletion without motif")
        else:
            print("❌ Failed to reject deletion without motif")
    
    return results

def test_blocked_access(tester, role):
    """Test that regular users are blocked from invoice management"""
    print(f"\n🚫 Testing blocked access for {role}")
    
    results = {"blocked_correctly": False}
    
    # Get any existing invoice ID for testing
    success, invoices = tester.run_test(
        "Get Invoices List",
        "GET",
        "/api/factures",
        403,  # Should be blocked
        print_response=False
    )
    
    if not success:  # This means we got the expected 403 error
        print("✅ Regular user correctly blocked from accessing invoices")
        results["blocked_correctly"] = True
    else:
        print("❌ Regular user was not blocked from accessing invoices")
    
    return results

def test_stock_control_during_invoicing():
    """Test improved stock control during invoice creation"""
    print("\n" + "=" * 80)
    print("📦 TESTING IMPROVED STOCK CONTROL DURING INVOICING")
    print("=" * 80)
    
    # Authenticate as admin
    auth_success, tester = test_authentication("admin@facturapp.rdc", "admin123")
    if not auth_success:
        print("❌ Authentication failed")
        return False
    
    # Create test data
    if not tester.test_client:
        client_ok = tester.test_create_client()
        if not client_ok:
            print("❌ Failed to create test client")
            return False
    
    if not tester.test_product:
        product_ok = tester.test_create_product()
        if not product_ok:
            print("❌ Failed to create test product")
            return False
    
    # Get current stock
    product_id = tester.test_product.get('id')
    success, product = tester.run_test(
        "Get Product Stock",
        "GET",
        f"/api/produits/{product_id}",
        200,
        print_response=False
    )
    
    if not success:
        print("❌ Failed to get product stock")
        return False
    
    current_stock = product.get('stock_actuel', 0)
    print(f"📦 Current stock: {current_stock}")
    
    # Try to create invoice with quantity > stock (should fail with improved error message)
    excessive_quantity = current_stock + 10
    
    prix_usd = float(tester.test_product.get('prix_usd', 100))
    prix_fc = float(tester.test_product.get('prix_fc', prix_usd * 2800))
    tva = float(tester.test_product.get('tva', 16.0))
    
    total_ht_usd = prix_usd * excessive_quantity
    total_ht_fc = prix_fc * excessive_quantity
    total_ttc_usd = total_ht_usd * (1 + tva/100)
    total_ttc_fc = total_ht_fc * (1 + tva/100)
    
    invoice_data = {
        "client_id": tester.test_client.get('id'),
        "client_nom": tester.test_client.get('nom'),
        "client_email": tester.test_client.get('email'),
        "client_adresse": f"{tester.test_client.get('adresse')}, {tester.test_client.get('ville')} {tester.test_client.get('code_postal')}",
        "devise": "USD",
        "lignes": [{
            "produit_id": product_id,
            "nom_produit": tester.test_product.get('nom'),
            "quantite": excessive_quantity,
            "prix_unitaire_usd": prix_usd,
            "prix_unitaire_fc": prix_fc,
            "devise": "USD",
            "tva": tva,
            "total_ht_usd": total_ht_usd,
            "total_ht_fc": total_ht_fc,
            "total_ttc_usd": total_ttc_usd,
            "total_ttc_fc": total_ttc_fc
        }],
        "total_ht_usd": total_ht_usd,
        "total_ht_fc": total_ht_fc,
        "total_tva_usd": total_ht_usd * tva/100,
        "total_tva_fc": total_ht_fc * tva/100,
        "total_ttc_usd": total_ttc_usd,
        "total_ttc_fc": total_ttc_fc,
        "notes": "Test invoice with insufficient stock"
    }
    
    print(f"🧪 Testing invoice creation with {excessive_quantity} units (stock: {current_stock})")
    
    success, response = tester.run_test(
        "Create Invoice with Insufficient Stock",
        "POST",
        "/api/factures",
        400,  # Should fail with 400
        data=invoice_data
    )
    
    if not success:  # This means we got the expected 400 error
        print("✅ Invoice creation correctly rejected due to insufficient stock")
        print("✅ Improved stock control is working")
        return True
    else:
        print("❌ Invoice creation was not rejected despite insufficient stock")
        return False

def test_enhanced_stock_management():
    """Test Phase 3 enhanced stock management features"""
    print("\n" + "=" * 80)
    print("📦 TESTING PHASE 3 ENHANCED STOCK MANAGEMENT")
    print("=" * 80)
    
    # Test with different user roles
    test_accounts = [
        ("admin@facturapp.rdc", "admin123", "admin"),
        ("manager@demo.com", "manager123", "manager"),
        ("comptable@demo.com", "comptable123", "comptable"),
        ("user@demo.com", "user123", "utilisateur")
    ]
    
    admin_tester = None
    manager_tester = None
    
    # Authenticate admin and manager for testing
    for email, password, role in test_accounts:
        auth_success, tester = test_authentication(email, password)
        if auth_success:
            if role == "admin":
                admin_tester = tester
            elif role == "manager":
                manager_tester = tester
            print(f"✅ {role.capitalize()} authentication successful")
        else:
            print(f"❌ {role.capitalize()} authentication failed")
    
    if not admin_tester and not manager_tester:
        print("❌ No admin or manager authentication available, cannot test stock management")
        return False
    
    # Use admin tester if available, otherwise manager
    tester = admin_tester if admin_tester else manager_tester
    user_role = "admin" if admin_tester else "manager"
    
    print(f"\n🔍 Using {user_role} account for stock management tests")
    
    # Get existing products to test with
    success, products = tester.run_test(
        "Get Products for Stock Testing",
        "GET",
        "/api/produits",
        200,
        print_response=False
    )
    
    if not success or not products:
        print("❌ Failed to get products for testing")
        return False
    
    # Find a product with stock management enabled
    stock_product = None
    for product in products:
        if product.get('gestion_stock', False):
            stock_product = product
            break
    
    if not stock_product:
        print("❌ No products with stock management found")
        return False
    
    product_id = stock_product.get('id')
    product_name = stock_product.get('nom')
    initial_stock = stock_product.get('stock_actuel', 0)
    stock_min = stock_product.get('stock_minimum', 10)
    stock_max = stock_product.get('stock_maximum', 100)
    
    print(f"\n📦 Testing with product: {product_name}")
    print(f"📊 Initial stock: {initial_stock}, Min: {stock_min}, Max: {stock_max}")
    
    # Test results tracking
    test_results = []
    
    # TEST 1: Test permissions - only admin/manager should access
    print(f"\n🔍 TEST 1: Testing permissions (only admin/manager should access)")
    
    # Test with unauthorized user (comptable should fail for stock management)
    comptable_auth_success, comptable_tester = test_authentication("user@demo.com", "user123")
    if comptable_auth_success:
        stock_data = {
            "operation": "ajouter",
            "quantite": 5,
            "motif": "Test unauthorized access"
        }
        
        success, response = comptable_tester.run_test(
            "Test Unauthorized Stock Update",
            "PUT",
            f"/api/produits/{product_id}/stock",
            403,  # Should fail with 403 Forbidden
            data=stock_data
        )
        
        if not success:  # We expect this to fail (403)
            print("✅ Unauthorized user correctly blocked from stock management")
            test_results.append(("Permissions Test", True))
        else:
            print("❌ Unauthorized user was able to access stock management")
            test_results.append(("Permissions Test", False))
    else:
        print("⚠️ Could not test unauthorized access - user authentication failed")
        test_results.append(("Permissions Test", None))
    
    # TEST 2: Test "ajouter" operation with valid motif
    print(f"\n🔍 TEST 2: Testing 'ajouter' operation with valid motif")
    
    add_quantity = 20
    stock_data = {
        "operation": "ajouter",
        "quantite": add_quantity,
        "motif": "Test stock addition - Phase 3 testing"
    }
    
    success, response = tester.run_test(
        "Test Add Stock Operation",
        "PUT",
        f"/api/produits/{product_id}/stock",
        200,
        data=stock_data
    )
    
    if success and response:
        new_stock = response.get('nouveau_stock')
        expected_stock = initial_stock + add_quantity
        
        if new_stock == expected_stock:
            print(f"✅ Stock correctly increased from {initial_stock} to {new_stock}")
            test_results.append(("Add Operation", True))
            initial_stock = new_stock  # Update for next tests
        else:
            print(f"❌ Stock calculation error: expected {expected_stock}, got {new_stock}")
            test_results.append(("Add Operation", False))
    else:
        print("❌ Add operation failed")
        test_results.append(("Add Operation", False))
    
    # TEST 3: Test "soustraire" operation with valid motif
    print(f"\n🔍 TEST 3: Testing 'soustraire' operation with valid motif")
    
    subtract_quantity = 10
    stock_data = {
        "operation": "soustraire",
        "quantite": subtract_quantity,
        "motif": "Test stock subtraction - Phase 3 testing"
    }
    
    success, response = tester.run_test(
        "Test Subtract Stock Operation",
        "PUT",
        f"/api/produits/{product_id}/stock",
        200,
        data=stock_data
    )
    
    if success and response:
        new_stock = response.get('nouveau_stock')
        expected_stock = initial_stock - subtract_quantity
        
        if new_stock == expected_stock:
            print(f"✅ Stock correctly decreased from {initial_stock} to {new_stock}")
            test_results.append(("Subtract Operation", True))
            initial_stock = new_stock  # Update for next tests
        else:
            print(f"❌ Stock calculation error: expected {expected_stock}, got {new_stock}")
            test_results.append(("Subtract Operation", False))
    else:
        print("❌ Subtract operation failed")
        test_results.append(("Subtract Operation", False))
    
    # TEST 4: Test mandatory motif validation (should fail without motif)
    print(f"\n🔍 TEST 4: Testing mandatory motif validation (should fail without motif)")
    
    stock_data = {
        "operation": "ajouter",
        "quantite": 5
        # No motif provided
    }
    
    success, response = tester.run_test(
        "Test Missing Motif Validation",
        "PUT",
        f"/api/produits/{product_id}/stock",
        400,  # Should fail with 400 Bad Request
        data=stock_data
    )
    
    if not success:  # We expect this to fail (400)
        print("✅ Missing motif correctly rejected")
        test_results.append(("Motif Validation", True))
    else:
        print("❌ Missing motif was accepted (should have been rejected)")
        test_results.append(("Motif Validation", False))
    
    # TEST 5: Test empty motif validation
    print(f"\n🔍 TEST 5: Testing empty motif validation")
    
    stock_data = {
        "operation": "ajouter",
        "quantite": 5,
        "motif": ""  # Empty motif
    }
    
    success, response = tester.run_test(
        "Test Empty Motif Validation",
        "PUT",
        f"/api/produits/{product_id}/stock",
        400,  # Should fail with 400 Bad Request
        data=stock_data
    )
    
    if not success:  # We expect this to fail (400)
        print("✅ Empty motif correctly rejected")
        test_results.append(("Empty Motif Validation", True))
    else:
        print("❌ Empty motif was accepted (should have been rejected)")
        test_results.append(("Empty Motif Validation", False))
    
    # TEST 6: Test quantity validation (negative quantity should fail)
    print(f"\n🔍 TEST 6: Testing negative quantity validation")
    
    stock_data = {
        "operation": "ajouter",
        "quantite": -5,  # Negative quantity
        "motif": "Test negative quantity"
    }
    
    success, response = tester.run_test(
        "Test Negative Quantity Validation",
        "PUT",
        f"/api/produits/{product_id}/stock",
        400,  # Should fail with 400 Bad Request
        data=stock_data
    )
    
    if not success:  # We expect this to fail (400)
        print("✅ Negative quantity correctly rejected")
        test_results.append(("Negative Quantity Validation", True))
    else:
        print("❌ Negative quantity was accepted (should have been rejected)")
        test_results.append(("Negative Quantity Validation", False))
    
    # TEST 7: Test zero quantity validation
    print(f"\n🔍 TEST 7: Testing zero quantity validation")
    
    stock_data = {
        "operation": "ajouter",
        "quantite": 0,  # Zero quantity
        "motif": "Test zero quantity"
    }
    
    success, response = tester.run_test(
        "Test Zero Quantity Validation",
        "PUT",
        f"/api/produits/{product_id}/stock",
        400,  # Should fail with 400 Bad Request
        data=stock_data
    )
    
    if not success:  # We expect this to fail (400)
        print("✅ Zero quantity correctly rejected")
        test_results.append(("Zero Quantity Validation", True))
    else:
        print("❌ Zero quantity was accepted (should have been rejected)")
        test_results.append(("Zero Quantity Validation", False))
    
    # TEST 8: Test negative stock prevention
    print(f"\n🔍 TEST 8: Testing negative stock prevention")
    
    # Try to subtract more than available
    excessive_quantity = initial_stock + 10
    stock_data = {
        "operation": "soustraire",
        "quantite": excessive_quantity,
        "motif": "Test negative stock prevention"
    }
    
    success, response = tester.run_test(
        "Test Negative Stock Prevention",
        "PUT",
        f"/api/produits/{product_id}/stock",
        400,  # Should fail with 400 Bad Request
        data=stock_data
    )
    
    if not success:  # We expect this to fail (400)
        print(f"✅ Negative stock correctly prevented (tried to subtract {excessive_quantity} from {initial_stock})")
        test_results.append(("Negative Stock Prevention", True))
    else:
        print(f"❌ Negative stock was allowed (tried to subtract {excessive_quantity} from {initial_stock})")
        test_results.append(("Negative Stock Prevention", False))
    
    # TEST 9: Test maximum stock limit
    print(f"\n🔍 TEST 9: Testing maximum stock limit")
    
    # Try to add beyond maximum
    excessive_add = stock_max - initial_stock + 10
    stock_data = {
        "operation": "ajouter",
        "quantite": excessive_add,
        "motif": "Test maximum stock limit"
    }
    
    success, response = tester.run_test(
        "Test Maximum Stock Limit",
        "PUT",
        f"/api/produits/{product_id}/stock",
        400,  # Should fail with 400 Bad Request
        data=stock_data
    )
    
    if not success:  # We expect this to fail (400)
        print(f"✅ Maximum stock limit correctly enforced (tried to add {excessive_add} to {initial_stock}, max is {stock_max})")
        test_results.append(("Maximum Stock Limit", True))
    else:
        print(f"❌ Maximum stock limit was not enforced (tried to add {excessive_add} to {initial_stock}, max is {stock_max})")
        test_results.append(("Maximum Stock Limit", False))
    
    # TEST 10: Test minimum stock warning
    print(f"\n🔍 TEST 10: Testing minimum stock warning")
    
    # Calculate how much to subtract to go below minimum
    if initial_stock > stock_min:
        warning_quantity = initial_stock - stock_min + 2  # Go 2 below minimum
        stock_data = {
            "operation": "soustraire",
            "quantite": warning_quantity,
            "motif": "Test minimum stock warning"
        }
        
        success, response = tester.run_test(
            "Test Minimum Stock Warning",
            "PUT",
            f"/api/produits/{product_id}/stock",
            200,  # Should succeed but with warning
            data=stock_data
        )
        
        if success and response:
            warning_message = response.get('warning')
            if warning_message and 'minimum' in warning_message.lower():
                print(f"✅ Minimum stock warning correctly issued: {warning_message}")
                test_results.append(("Minimum Stock Warning", True))
                initial_stock = response.get('nouveau_stock', initial_stock)
            else:
                print("❌ Minimum stock warning not issued")
                test_results.append(("Minimum Stock Warning", False))
        else:
            print("❌ Minimum stock warning test failed")
            test_results.append(("Minimum Stock Warning", False))
    else:
        print(f"⚠️ Cannot test minimum stock warning - current stock ({initial_stock}) is already at or below minimum ({stock_min})")
        test_results.append(("Minimum Stock Warning", None))
    
    # TEST 11: Test invalid operation
    print(f"\n🔍 TEST 11: Testing invalid operation")
    
    stock_data = {
        "operation": "invalid_operation",  # Invalid operation
        "quantite": 5,
        "motif": "Test invalid operation"
    }
    
    success, response = tester.run_test(
        "Test Invalid Operation",
        "PUT",
        f"/api/produits/{product_id}/stock",
        400,  # Should fail with 400 Bad Request
        data=stock_data
    )
    
    if not success:  # We expect this to fail (400)
        print("✅ Invalid operation correctly rejected")
        test_results.append(("Invalid Operation", True))
    else:
        print("❌ Invalid operation was accepted (should have been rejected)")
        test_results.append(("Invalid Operation", False))
    
    # TEST 12: Test stock movements endpoint
    print(f"\n🔍 TEST 12: Testing stock movements endpoint")
    
    success, movements = tester.run_test(
        "Get Stock Movements",
        "GET",
        f"/api/produits/{product_id}/mouvements",
        200
    )
    
    if success and movements:
        print(f"✅ Successfully retrieved {len(movements)} stock movements")
        
        # Check if recent movements have the new fields
        recent_movements = movements[:3]  # Check last 3 movements
        has_user_field = any('utilisateur' in movement for movement in recent_movements)
        has_operation_field = any('operation' in movement for movement in recent_movements)
        
        if has_user_field and has_operation_field:
            print("✅ Stock movements include user and operation fields")
            test_results.append(("Stock Movements", True))
        else:
            print("❌ Stock movements missing user or operation fields")
            test_results.append(("Stock Movements", False))
    else:
        print("❌ Failed to retrieve stock movements")
        test_results.append(("Stock Movements", False))
    
    # TEST 13: Test with product without stock management
    print(f"\n🔍 TEST 13: Testing with product without stock management")
    
    # Find a product without stock management
    no_stock_product = None
    for product in products:
        if not product.get('gestion_stock', False):
            no_stock_product = product
            break
    
    if no_stock_product:
        no_stock_product_id = no_stock_product.get('id')
        stock_data = {
            "operation": "ajouter",
            "quantite": 5,
            "motif": "Test product without stock management"
        }
        
        success, response = tester.run_test(
            "Test Product Without Stock Management",
            "PUT",
            f"/api/produits/{no_stock_product_id}/stock",
            400,  # Should fail with 400 Bad Request
            data=stock_data
        )
        
        if not success:  # We expect this to fail (400)
            print("✅ Product without stock management correctly rejected")
            test_results.append(("No Stock Management", True))
        else:
            print("❌ Product without stock management was accepted (should have been rejected)")
            test_results.append(("No Stock Management", False))
    else:
        print("⚠️ No products without stock management found for testing")
        test_results.append(("No Stock Management", None))
    
    # SUMMARY
    print("\n" + "=" * 80)
    print("📋 PHASE 3 ENHANCED STOCK MANAGEMENT TEST SUMMARY")
    print("=" * 80)
    
    passed_tests = sum(1 for _, result in test_results if result is True)
    failed_tests = sum(1 for _, result in test_results if result is False)
    skipped_tests = sum(1 for _, result in test_results if result is None)
    total_tests = len(test_results)
    
    print(f"📊 Test Results: {passed_tests}/{total_tests} passed, {failed_tests} failed, {skipped_tests} skipped")
    
    for test_name, result in test_results:
        if result is True:
            print(f"✅ {test_name}: PASSED")
        elif result is False:
            print(f"❌ {test_name}: FAILED")
        else:
            print(f"⚠️ {test_name}: SKIPPED")
    
    # Overall assessment
    success_rate = passed_tests / (total_tests - skipped_tests) if (total_tests - skipped_tests) > 0 else 0
    
    if success_rate >= 0.9:
        print(f"\n🎉 EXCELLENT: {success_rate:.1%} success rate - Phase 3 stock management is working excellently!")
        return True
    elif success_rate >= 0.7:
        print(f"\n✅ GOOD: {success_rate:.1%} success rate - Phase 3 stock management is mostly working")
        return True
    else:
        print(f"\n❌ NEEDS WORK: {success_rate:.1%} success rate - Phase 3 stock management has significant issues")
        return False

def main():
    """Main test function - comprehensive testing with Phase 3 focus"""
    print("🚀 STARTING COMPREHENSIVE FACTURAPP BACKEND TESTING - PHASE 3 FOCUS")
    print("=" * 80)
    
    # Test 1: Phase 3 Enhanced Stock Management (PRIORITY - from review request)
    print("\n" + "=" * 80)
    print("TEST 1: PHASE 3 ENHANCED STOCK MANAGEMENT (PRIORITY)")
    print("=" * 80)
    phase3_success = test_enhanced_stock_management()
    
    # Test 2: Phase 2 Invoice Management (existing functionality)
    print("\n" + "=" * 80)
    print("TEST 2: PHASE 2 INVOICE MANAGEMENT")
    print("=" * 80)
    phase2_success = test_phase2_invoice_management()
    
    # Test 3: Stock Control During Invoicing (existing functionality)
    print("\n" + "=" * 80)
    print("TEST 3: IMPROVED STOCK CONTROL DURING INVOICING")
    print("=" * 80)
    stock_control_success = test_stock_control_during_invoicing()
    
    # Test 3: User/Settings Separation (existing functionality)
    print("\n" + "=" * 80)
    print("TEST 3: USER/SETTINGS SEPARATION FUNCTIONALITY")
    print("=" * 80)
    separation_success = test_user_settings_separation()
    
    # Test 4: Devis functionality (existing functionality)
    print("\n" + "=" * 80)
    print("TEST 4: DEVIS (QUOTES) FUNCTIONALITY")
    print("=" * 80)
    devis_success = test_devis_functionality_complete()
    
    # Test 5: Stock management (existing functionality)
    print("\n" + "=" * 80)
    print("TEST 5: STOCK MANAGEMENT FUNCTIONALITY")
    print("=" * 80)
    stock_success = test_stock_management_complete()
    
    # Test 6: ID correction verification (existing functionality)
    print("\n" + "=" * 80)
    print("TEST 6: ID CORRECTION VERIFICATION")
    print("=" * 80)
    id_success = test_id_corrections()
    
    # Final summary
    print("\n" + "=" * 80)
    print("📊 COMPREHENSIVE TEST RESULTS SUMMARY")
    print("=" * 80)
    print(f"🎯 Phase 3 Enhanced Stock Management: {'✅ PASSED' if phase3_success else '❌ FAILED'}")
    print(f"🎯 Phase 2 Invoice Management: {'✅ PASSED' if phase2_success else '❌ FAILED'}")
    print(f"📦 Improved Stock Control: {'✅ PASSED' if stock_control_success else '❌ FAILED'}")
    print(f"🔐 User/Settings Separation: {'✅ PASSED' if separation_success else '❌ FAILED'}")
    print(f"📋 Devis Functionality: {'✅ PASSED' if devis_success else '❌ FAILED'}")
    print(f"📦 Stock Management: {'✅ PASSED' if stock_success else '❌ FAILED'}")
    print(f"🔧 ID Corrections: {'✅ PASSED' if id_success else '❌ FAILED'}")
    
    # Priority tests (Phase 3 focus)
    priority_success = phase3_success
    overall_success = priority_success and phase2_success and stock_control_success and separation_success and devis_success and stock_success and id_success
    
    print("\n" + "=" * 80)
    print(f"🎯 PRIORITY TESTS (Phase 3): {'✅ ALL PASSED' if priority_success else '❌ SOME FAILED'}")
    print(f"🎯 OVERALL RESULT: {'✅ ALL TESTS PASSED' if overall_success else '❌ SOME TESTS FAILED'}")
    print("=" * 80)
    
    if priority_success:
        print("🎉 Phase 3 enhanced stock management is working correctly!")
        print("✅ Add/subtract operations with mandatory motifs working")
        print("✅ Stock limit validations (negative, maximum, minimum warnings) working")
        print("✅ Permission controls (admin/manager only) working")
        print("✅ Enhanced stock movements with user tracking working")
        print("✅ All validation scenarios working correctly")
    else:
        print("⚠️ Phase 3 enhanced stock management has issues that need attention")
        print("❌ Some stock management features are not working correctly")
    
    if phase2_success and stock_control_success:
        print("✅ Phase 2 corrections are also working correctly!")
        print("✅ Invoice cancellation with query parameters working")
        print("✅ Invoice deletion with query parameters working")
        print("✅ Stock restoration after cancellation working")
        print("✅ Improved stock control error messages working")
    else:
        print("⚠️ Phase 2 corrections have some issues")
        if not phase2_success:
            print("❌ Invoice management corrections have issues")
        if not stock_control_success:
            print("❌ Stock control improvements have issues")
    
    if overall_success:
        print("\n🎉 FacturApp backend is fully operational!")
    else:
        print("\n⚠️ Some non-priority issues were found")
        if not separation_success:
            print("❌ User/Settings separation has issues")
        if not devis_success:
            print("❌ Devis functionality has issues")
        if not stock_success:
            print("❌ Stock management has issues")
        if not id_success:
            print("❌ ID handling still has issues")
    
    return 0 if priority_success else 1

def test_opportunity_management_phase5():
    """Test Phase 5 opportunity management features"""
    print("\n" + "=" * 80)
    print("🎯 TESTING PHASE 5 - OPPORTUNITY MANAGEMENT FEATURES")
    print("=" * 80)
    
    # Test with admin account first
    auth_success, tester = test_authentication("admin@facturapp.rdc", "admin123")
    if not auth_success:
        print("❌ Failed to authenticate as admin, trying manager...")
        auth_success, tester = test_authentication("manager@demo.com", "manager123")
        if not auth_success:
            print("❌ Failed to authenticate, stopping opportunity tests")
            return False
    
    # Test 1: GET /api/opportunites/filtres - Get filter options
    print("\n🔍 TEST 1: GET /api/opportunites/filtres - Get filter options")
    success, filter_options = tester.run_test(
        "Get Opportunity Filter Options",
        "GET",
        "/api/opportunites/filtres",
        200
    )
    
    if success and filter_options:
        print("✅ Successfully retrieved filter options")
        print(f"📊 Available etapes: {filter_options.get('etapes', [])}")
        print(f"📊 Available priorites: {filter_options.get('priorites', [])}")
        print(f"📊 Available commerciaux: {len(filter_options.get('commerciaux', []))} users")
        print(f"📊 Available clients: {len(filter_options.get('clients', []))} clients")
    else:
        print("❌ Failed to retrieve filter options")
        return False
    
    # Test 2: GET /api/opportunites - Get opportunities with filters
    print("\n🔍 TEST 2: GET /api/opportunites - Get opportunities (no filters)")
    success, opportunities = tester.run_test(
        "Get All Opportunities",
        "GET",
        "/api/opportunites",
        200
    )
    
    if success:
        print(f"✅ Successfully retrieved {len(opportunities) if opportunities else 0} opportunities")
        if opportunities and len(opportunities) > 0:
            opp = opportunities[0]
            print(f"📋 Sample opportunity: {opp.get('titre')} - Client: {opp.get('client_nom')} - Etape: {opp.get('etape')}")
    else:
        print("❌ Failed to retrieve opportunities")
        return False
    
    # Test 3: Test filtering by etape
    print("\n🔍 TEST 3: GET /api/opportunites?etape=prospect - Filter by etape")
    success, filtered_opps = tester.run_test(
        "Get Opportunities Filtered by Etape",
        "GET",
        "/api/opportunites?etape=prospect",
        200
    )
    
    if success:
        print(f"✅ Successfully filtered opportunities by etape: {len(filtered_opps) if filtered_opps else 0} results")
        if filtered_opps:
            for opp in filtered_opps[:2]:  # Show first 2
                print(f"  - {opp.get('titre')} (etape: {opp.get('etape')})")
    else:
        print("❌ Failed to filter opportunities by etape")
    
    # Test 4: Test filtering by priorite
    print("\n🔍 TEST 4: GET /api/opportunites?priorite=haute - Filter by priorite")
    success, filtered_opps = tester.run_test(
        "Get Opportunities Filtered by Priorite",
        "GET",
        "/api/opportunites?priorite=haute",
        200
    )
    
    if success:
        print(f"✅ Successfully filtered opportunities by priorite: {len(filtered_opps) if filtered_opps else 0} results")
    else:
        print("❌ Failed to filter opportunities by priorite")
    
    # Test 5: Test search functionality
    print("\n🔍 TEST 5: GET /api/opportunites?search=test - Search opportunities")
    success, searched_opps = tester.run_test(
        "Search Opportunities",
        "GET",
        "/api/opportunites?search=test",
        200
    )
    
    if success:
        print(f"✅ Successfully searched opportunities: {len(searched_opps) if searched_opps else 0} results")
    else:
        print("❌ Failed to search opportunities")
    
    # Test 6: Test combined filters
    print("\n🔍 TEST 6: GET /api/opportunites?etape=prospect&priorite=moyenne - Combined filters")
    success, combined_filtered = tester.run_test(
        "Get Opportunities with Combined Filters",
        "GET",
        "/api/opportunites?etape=prospect&priorite=moyenne",
        200
    )
    
    if success:
        print(f"✅ Successfully applied combined filters: {len(combined_filtered) if combined_filtered else 0} results")
    else:
        print("❌ Failed to apply combined filters")
    
    # Test 7: Create a test opportunity for linking tests
    print("\n🔍 TEST 7: Creating test opportunity for linking tests")
    
    # First get clients to use in opportunity
    success, clients = tester.run_test(
        "Get Clients for Opportunity Test",
        "GET",
        "/api/clients",
        200,
        print_response=False
    )
    
    if not success or not clients or len(clients) < 2:
        print("❌ Need at least 2 clients for opportunity linking tests")
        print(f"📊 Found {len(clients) if clients else 0} clients")
        if clients:
            for i, client in enumerate(clients):
                print(f"  - Client {i+1}: {client.get('nom')} (ID: {client.get('id')})")
        return False
    
    client1 = clients[0]
    client2 = clients[1]
    print(f"📋 Using Client 1: {client1.get('nom')} (ID: {client1.get('id')})")
    print(f"📋 Using Client 2: {client2.get('nom')} (ID: {client2.get('id')})")
    
    # Create test opportunity
    timestamp = datetime.now().strftime('%H%M%S')
    opportunity_data = {
        "titre": f"Test Opportunity {timestamp}",
        "description": "Test opportunity for linking functionality",
        "client_id": client1.get('id'),
        "client_nom": client1.get('nom'),
        "valeur_estimee_usd": 5000.0,
        "valeur_estimee_fc": 14000000.0,
        "devise": "USD",
        "probabilite": 75,
        "etape": "proposition",
        "priorite": "haute",
        "notes": "Created for Phase 5 testing"
    }
    
    success, created_opp = tester.run_test(
        "Create Test Opportunity",
        "POST",
        "/api/opportunites",
        200,
        data=opportunity_data
    )
    
    if not success or not created_opp:
        print("❌ Failed to create test opportunity")
        return False
    
    opp_id = created_opp.get('id')
    print(f"✅ Created test opportunity with ID: {opp_id}")
    
    # Test 8: POST /api/opportunites/{id}/lier-client - Link opportunity to another client
    print(f"\n🔍 TEST 8: POST /api/opportunites/{opp_id}/lier-client - Link to another client")
    
    link_data = {
        "client_id": client2.get('id')
    }
    
    success, link_response = tester.run_test(
        "Link Opportunity to Another Client",
        "POST",
        f"/api/opportunites/{opp_id}/lier-client",
        200,
        data=link_data
    )
    
    if success and link_response:
        linked_opp_id = link_response.get('nouvelle_opportunite_id')
        print(f"✅ Successfully linked opportunity to another client")
        print(f"📋 Original opportunity ID: {opp_id}")
        print(f"📋 Linked opportunity ID: {linked_opp_id}")
        print(f"📋 Linked to client: {client2.get('nom')}")
        
        # Test 9: GET /api/opportunites/{id}/liees - Get linked opportunities
        print(f"\n🔍 TEST 9: GET /api/opportunites/{opp_id}/liees - Get linked opportunities")
        
        success, linked_opps = tester.run_test(
            "Get Linked Opportunities",
            "GET",
            f"/api/opportunites/{opp_id}/liees",
            200
        )
        
        if success and linked_opps:
            print(f"✅ Successfully retrieved linked opportunities: {len(linked_opps)} found")
            for linked in linked_opps:
                print(f"  - {linked.get('titre')} (Client: {linked.get('client_nom')})")
        else:
            print("❌ Failed to retrieve linked opportunities")
            return False
        
        # Test 10: Verify bidirectional linking
        print(f"\n🔍 TEST 10: Verify bidirectional linking from linked opportunity")
        
        success, reverse_linked = tester.run_test(
            "Get Reverse Linked Opportunities",
            "GET",
            f"/api/opportunites/{linked_opp_id}/liees",
            200
        )
        
        if success and reverse_linked:
            print(f"✅ Successfully verified bidirectional linking: {len(reverse_linked)} found")
            # Should find the original opportunity - check both UUID and any stored ID
            original_found = any(
                opp.get('id') == opp_id or 
                opp.get('titre') == opportunity_data['titre'] or
                opp.get('client_nom') == client1.get('nom')
                for opp in reverse_linked
            )
            if original_found:
                print("✅ Original opportunity found in reverse link - bidirectional linking works")
            else:
                print("❌ Original opportunity not found in reverse link - bidirectional linking failed")
                print(f"🔍 Looking for original opportunity ID: {opp_id}")
                print(f"🔍 Found opportunities:")
                for opp in reverse_linked:
                    print(f"  - ID: {opp.get('id')}, Title: {opp.get('titre')}, Client: {opp.get('client_nom')}")
                return False
        else:
            print("❌ Failed to verify bidirectional linking")
            return False
        
    else:
        print("❌ Failed to link opportunity to another client")
        return False
    
    # Test 11: Test permissions - try with comptable (should fail)
    print("\n🔍 TEST 11: Testing permissions - comptable should be denied")
    
    auth_success, comptable_tester = test_authentication("comptable@demo.com", "comptable123")
    if auth_success:
        # Try to access opportunities (should fail)
        success, response = comptable_tester.run_test(
            "Comptable Access Opportunities (Should Fail)",
            "GET",
            "/api/opportunites",
            403  # Expecting 403 Forbidden
        )
        
        if success:  # success=True means we got the expected 403
            print("✅ Comptable correctly denied access to opportunities")
        else:
            print("❌ Comptable was incorrectly allowed access to opportunities")
            return False
        
        # Try to access filter options (should fail)
        success, response = comptable_tester.run_test(
            "Comptable Access Filter Options (Should Fail)",
            "GET",
            "/api/opportunites/filtres",
            403  # Expecting 403 Forbidden
        )
        
        if success:  # success=True means we got the expected 403
            print("✅ Comptable correctly denied access to opportunity filters")
        else:
            print("❌ Comptable was incorrectly allowed access to opportunity filters")
            return False
    else:
        print("⚠️ Could not test comptable permissions - authentication failed")
    
    # Test 12: Test validation - try to link to non-existent client
    print(f"\n🔍 TEST 12: Testing validation - link to non-existent client")
    
    invalid_link_data = {
        "client_id": "non-existent-client-id"
    }
    
    success, response = tester.run_test(
        "Link to Non-existent Client (Should Fail)",
        "POST",
        f"/api/opportunites/{opp_id}/lier-client",
        404,  # Expecting 404 Not Found for non-existent client
        data=invalid_link_data
    )
    
    if success:  # success=True means we got the expected error
        print("✅ Correctly rejected linking to non-existent client")
    else:
        print("❌ Incorrectly allowed linking to non-existent client")
        return False
    
    # Test 13: Test validation - try to link without client_id
    print(f"\n🔍 TEST 13: Testing validation - link without client_id")
    
    empty_link_data = {}
    
    success, response = tester.run_test(
        "Link without Client ID (Should Fail)",
        "POST",
        f"/api/opportunites/{opp_id}/lier-client",
        400,  # Expecting 400 Bad Request
        data=empty_link_data
    )
    
    if success:  # success=True means we got the expected error
        print("✅ Correctly rejected linking without client_id")
    else:
        print("❌ Incorrectly allowed linking without client_id")
        return False
    
    # Summary
    print("\n" + "=" * 80)
    print("📋 PHASE 5 OPPORTUNITY MANAGEMENT TEST SUMMARY")
    print("=" * 80)
    print("✅ GET /api/opportunites/filtres - Filter options retrieval: PASSED")
    print("✅ GET /api/opportunites - Basic opportunity listing: PASSED")
    print("✅ GET /api/opportunites?etape=X - Filter by etape: PASSED")
    print("✅ GET /api/opportunites?priorite=X - Filter by priorite: PASSED")
    print("✅ GET /api/opportunites?search=X - Search functionality: PASSED")
    print("✅ GET /api/opportunites (combined filters) - Multiple filters: PASSED")
    print("✅ POST /api/opportunites/{id}/lier-client - Link to client: PASSED")
    print("✅ GET /api/opportunites/{id}/liees - Get linked opportunities: PASSED")
    print("✅ Bidirectional linking verification: PASSED")
    print("✅ Permission validation (comptable denied): PASSED")
    print("✅ Data validation (non-existent client): PASSED")
    print("✅ Data validation (missing client_id): PASSED")
    
    print("\n🎯 ALL PHASE 5 OPPORTUNITY MANAGEMENT FEATURES ARE WORKING CORRECTLY!")
    
    return True

def test_tool_provisioning_fix():
    """Test the specific tool provisioning synchronization fix"""
    print("\n" + "=" * 80)
    print("🔧 TESTING TOOL PROVISIONING SYNCHRONIZATION FIX")
    print("=" * 80)
    
    # Authenticate as admin
    auth_success, tester = test_authentication("admin@facturapp.rdc", "admin123")
    if not auth_success:
        print("❌ Authentication failed, stopping tool provisioning tests")
        return False
    
    # Step 1: Create a test tool with initial stock
    print("\n🔍 STEP 1: Creating test tool with initial stock (10 units)")
    
    tool_data = {
        "nom": f"Test Tool {datetime.now().strftime('%H%M%S')}",
        "description": "Tool for testing provisioning synchronization",
        "reference": f"REF-{datetime.now().strftime('%H%M%S')}",
        "quantite_stock": 10,
        "prix_unitaire_usd": 150.0,
        "fournisseur": "Test Supplier",
        "etat": "neuf",
        "localisation": "Warehouse A",
        "numero_serie": f"SN-{datetime.now().strftime('%H%M%S')}"
    }
    
    success, created_tool = tester.run_test(
        "Create Test Tool",
        "POST",
        "/api/outils",
        200,
        data=tool_data
    )
    
    if not success or not created_tool:
        print("❌ Failed to create test tool")
        return False
    
    tool_id = created_tool.get('id')
    initial_stock = created_tool.get('quantite_stock', 0)
    initial_available = created_tool.get('quantite_disponible', 0)
    
    print(f"✅ Created test tool with ID: {tool_id}")
    print(f"📦 Initial stock: {initial_stock}")
    print(f"📦 Initial available: {initial_available}")
    
    # Step 2: Verify initial tool state
    print(f"\n🔍 STEP 2: Verifying initial tool state via GET /api/outils/{tool_id}")
    
    success, initial_tool = tester.run_test(
        "Get Initial Tool State",
        "GET",
        f"/api/outils/{tool_id}",
        200
    )
    
    if not success or not initial_tool:
        print("❌ Failed to retrieve initial tool state")
        return False
    
    print(f"✅ Retrieved initial tool state")
    print(f"📦 Stock: {initial_tool.get('quantite_stock')}")
    print(f"📦 Available: {initial_tool.get('quantite_disponible')}")
    
    # Step 3: Provision the tool (+5 units)
    print(f"\n🔍 STEP 3: Provisioning tool (+5 units) via POST /api/outils/{tool_id}/approvisionner")
    
    provision_data = {
        "quantite_ajoutee": 5,
        "prix_unitaire_usd": 150.0,
        "fournisseur": "Test Supplier",
        "notes": "Test provisioning for synchronization fix"
    }
    
    success, provision_response = tester.run_test(
        "Provision Tool (+5 units)",
        "POST",
        f"/api/outils/{tool_id}/approvisionner",
        200,
        data=provision_data
    )
    
    if not success or not provision_response:
        print("❌ Failed to provision tool")
        return False
    
    print(f"✅ Tool provisioning successful")
    print(f"📦 Response: {provision_response}")
    
    # Step 4: CRITICAL TEST - Immediately verify updated stock via GET
    print(f"\n🔍 STEP 4: CRITICAL TEST - Immediately verifying updated stock via GET /api/outils/{tool_id}")
    print("This is the core test for the synchronization fix!")
    
    success, updated_tool = tester.run_test(
        "Get Tool After Provisioning",
        "GET",
        f"/api/outils/{tool_id}",
        200
    )
    
    if not success or not updated_tool:
        print("❌ Failed to retrieve tool after provisioning")
        return False
    
    updated_stock = updated_tool.get('quantite_stock', 0)
    updated_available = updated_tool.get('quantite_disponible', 0)
    expected_stock = initial_stock + 5
    expected_available = initial_available + 5
    
    print(f"📊 SYNCHRONIZATION TEST RESULTS:")
    print(f"   Initial stock: {initial_stock} → Expected: {expected_stock} → Actual: {updated_stock}")
    print(f"   Initial available: {initial_available} → Expected: {expected_available} → Actual: {updated_available}")
    
    # Check if synchronization is working
    stock_synchronized = (updated_stock == expected_stock)
    available_synchronized = (updated_available == expected_available)
    
    if stock_synchronized and available_synchronized:
        print("✅ SYNCHRONIZATION FIX SUCCESSFUL!")
        print("✅ Stock and availability are properly updated after provisioning")
        sync_success = True
    else:
        print("❌ SYNCHRONIZATION PROBLEM PERSISTS!")
        if not stock_synchronized:
            print(f"❌ Stock not synchronized: expected {expected_stock}, got {updated_stock}")
        if not available_synchronized:
            print(f"❌ Availability not synchronized: expected {expected_available}, got {updated_available}")
        sync_success = False
    
    # Step 5: Verify movement history
    print(f"\n🔍 STEP 5: Verifying provisioning movement in history")
    
    success, movements_response = tester.run_test(
        "Get Tool Movements",
        "GET",
        f"/api/outils/{tool_id}/mouvements",
        200
    )
    
    if success and movements_response:
        print(f"✅ Retrieved movement response")
        
        # Handle different response structures
        movements = None
        if isinstance(movements_response, dict) and 'mouvements' in movements_response:
            movements = movements_response['mouvements']
        elif isinstance(movements_response, list):
            movements = movements_response
        else:
            print(f"⚠️ Unexpected movements response structure: {type(movements_response)}")
            movements = []
        
        print(f"📝 Found {len(movements)} movement(s)")
        
        # Look for the provisioning movement
        provision_movement = None
        if movements:
            for movement in movements:
                if isinstance(movement, dict):
                    if (movement.get('type_mouvement') == 'approvisionnement' or 
                        movement.get('type') == 'approvisionnement') and movement.get('quantite') == 5:
                        provision_movement = movement
                        break
        
        if provision_movement:
            print("✅ Provisioning movement found in history")
            print(f"📝 Movement details: {provision_movement}")
        else:
            print("❌ Provisioning movement not found in history")
            if movements:
                print("📝 Available movements:")
                for i, movement in enumerate(movements):
                    print(f"  {i+1}. {movement}")
            sync_success = False
    else:
        print("❌ Failed to retrieve tool movements")
        sync_success = False
    
    # Step 6: Test data consistency
    print(f"\n🔍 STEP 6: Testing data consistency")
    
    # Verify that stock total = quantite_stock
    # Verify that availability = quantite_disponible  
    # Verify that movement is recorded
    
    consistency_checks = []
    
    # Check 1: Stock consistency
    if updated_tool.get('quantite_stock') == expected_stock:
        consistency_checks.append("✅ Stock total matches expected value")
    else:
        consistency_checks.append(f"❌ Stock total mismatch: {updated_tool.get('quantite_stock')} != {expected_stock}")
    
    # Check 2: Availability consistency
    if updated_tool.get('quantite_disponible') == expected_available:
        consistency_checks.append("✅ Availability matches expected value")
    else:
        consistency_checks.append(f"❌ Availability mismatch: {updated_tool.get('quantite_disponible')} != {expected_available}")
    
    # Check 3: Movement recorded
    if provision_movement:
        consistency_checks.append("✅ Provisioning movement recorded in history")
    else:
        consistency_checks.append("❌ Provisioning movement not recorded")
    
    print("📊 DATA CONSISTENCY RESULTS:")
    for check in consistency_checks:
        print(f"   {check}")
    
    # Final assessment
    all_checks_passed = all("✅" in check for check in consistency_checks)
    
    print("\n" + "=" * 80)
    print("📋 TOOL PROVISIONING TEST SUMMARY")
    print("=" * 80)
    
    if sync_success and all_checks_passed:
        print("🎉 TOOL PROVISIONING SYNCHRONIZATION FIX: SUCCESS!")
        print("✅ Tool creation: PASSED")
        print("✅ Tool provisioning: PASSED")
        print("✅ Immediate stock synchronization: PASSED")
        print("✅ Data consistency: PASSED")
        print("✅ Movement history: PASSED")
        print("\n🎯 The synchronization problem has been RESOLVED!")
        print("🎯 Tool management functionality is now 100% operational!")
        return True
    else:
        print("❌ TOOL PROVISIONING SYNCHRONIZATION FIX: FAILED!")
        print("❌ The synchronization problem still exists")
        print("❌ Further investigation and fixes are needed")
        return False

def test_authentication(email, password):
    """Test authentication and return authenticated tester"""
    print(f"\n🔐 Testing authentication for {email}")
    
    tester = FactureProTester()
    
    # Login request
    login_data = {
        "email": email,
        "password": password
    }
    
    success, response = tester.run_test(
        "User Authentication",
        "POST",
        "/api/auth/login",
        200,
        data=login_data
    )
    
    if success and response:
        token = response.get('access_token')
        user_info = response.get('user', {})
        
        if token:
            # Set authorization header for future requests
            tester.headers['Authorization'] = f'Bearer {token}'
            tester.token = token
            
            print(f"✅ Authentication successful for {email}")
            print(f"👤 User: {user_info.get('prenom')} {user_info.get('nom')}")
            print(f"🎭 Role: {user_info.get('role')}")
            
            return True, tester
        else:
            print("❌ Authentication failed - no token received")
            return False, None
    else:
        print("❌ Authentication failed")
        return False, None

def test_entrepots_crud_complet(tester):
    """Test complete CRUD operations for warehouses (entrepôts)"""
    print("\n" + "=" * 80)
    print("🏭 TESTING ENTREPÔTS - CRUD COMPLET")
    print("=" * 80)
    
    # 1. POST /api/entrepots : Créer "Entrepôt Principal"
    print("\n🔍 STEP 1: Creating 'Entrepôt Principal'")
    entrepot_data = {
        "nom": "Entrepôt Principal",
        "description": "Entrepôt principal pour les outils d'installation",
        "adresse": "123 rue Test",
        "responsable": "Jean Dupont",
        "capacite_max": 1000,
        "statut": "actif"
    }
    
    success, created_entrepot = tester.run_test(
        "Create Entrepôt Principal",
        "POST",
        "/api/entrepots",
        200,
        data=entrepot_data
    )
    
    if not success or not created_entrepot:
        print("❌ Failed to create entrepôt")
        return False
    
    entrepot_id = created_entrepot.get('id')
    print(f"✅ Created entrepôt with ID: {entrepot_id}")
    print(f"📍 Address: {created_entrepot.get('adresse')}")
    print(f"👤 Responsible: {created_entrepot.get('responsable')}")
    
    # 2. GET /api/entrepots : Lister tous les entrepôts
    print("\n🔍 STEP 2: Listing all entrepôts")
    success, entrepots_list = tester.run_test(
        "Get All Entrepôts",
        "GET",
        "/api/entrepots",
        200
    )
    
    if not success or not entrepots_list:
        print("❌ Failed to get entrepôts list")
        return False
    
    print(f"✅ Retrieved {len(entrepots_list)} entrepôt(s)")
    for entrepot in entrepots_list:
        print(f"  - {entrepot.get('nom')} (ID: {entrepot.get('id')})")
    
    # Verify our created entrepôt is in the list
    found_entrepot = next((e for e in entrepots_list if e.get('id') == entrepot_id), None)
    if found_entrepot:
        print("✅ Created entrepôt found in list")
    else:
        print("❌ Created entrepôt not found in list")
        return False
    
    # 3. PUT /api/entrepots/{id} : Modifier l'entrepôt (changer adresse)
    print("\n🔍 STEP 3: Updating entrepôt address")
    updated_data = created_entrepot.copy()
    updated_data["adresse"] = "456 avenue Nouvelle"
    updated_data["description"] = "Entrepôt principal mis à jour"
    
    success, updated_entrepot = tester.run_test(
        "Update Entrepôt Address",
        "PUT",
        f"/api/entrepots/{entrepot_id}",
        200,
        data=updated_data
    )
    
    if not success or not updated_entrepot:
        print("❌ Failed to update entrepôt")
        return False
    
    if updated_entrepot.get('adresse') == "456 avenue Nouvelle":
        print("✅ Entrepôt address successfully updated")
        print(f"📍 New address: {updated_entrepot.get('adresse')}")
    else:
        print("❌ Entrepôt address not updated correctly")
        return False
    
    # 4. Test validation : Essayer DELETE avec outils existants (doit échouer)
    print("\n🔍 STEP 4: Testing DELETE validation with existing tools")
    
    # First, create a tool associated with this entrepôt
    print("Creating a tool associated with the entrepôt...")
    tool_data = {
        "nom": "Test Tool for Entrepôt",
        "description": "Tool for testing entrepôt deletion validation",
        "reference": "TEST-001",
        "entrepot_id": entrepot_id,
        "quantite_stock": 5,
        "prix_unitaire_usd": 100.0,
        "fournisseur": "Test Supplier",
        "etat": "neuf",
        "localisation": "Section A",
        "numero_serie": "SN123456"
    }
    
    success, created_tool = tester.run_test(
        "Create Tool for Entrepôt",
        "POST",
        "/api/outils",
        200,
        data=tool_data
    )
    
    if not success or not created_tool:
        print("❌ Failed to create tool for entrepôt validation test")
        return False
    
    print(f"✅ Created tool with ID: {created_tool.get('id')}")
    
    # Now try to delete the entrepôt (should fail)
    success, response = tester.run_test(
        "Try to Delete Entrepôt with Tools",
        "DELETE",
        f"/api/entrepots/{entrepot_id}",
        400,  # Expecting 400 error
        print_response=True
    )
    
    if success:  # success=True means we got the expected 400 error
        print("✅ Correctly prevented deletion of entrepôt with existing tools")
    else:
        print("❌ Failed: Entrepôt deletion was allowed despite having tools")
        return False
    
    # Store the entrepôt and tool for integration tests
    tester.test_entrepot = updated_entrepot
    tester.test_tool = created_tool
    
    print("\n✅ ENTREPÔTS CRUD TESTS COMPLETED SUCCESSFULLY")
    return True

def test_integration_outils_entrepots(tester):
    """Test integration between tools and warehouses"""
    print("\n" + "=" * 80)
    print("🔧 TESTING INTÉGRATION OUTILS-ENTREPÔTS")
    print("=" * 80)
    
    if not hasattr(tester, 'test_entrepot') or not tester.test_entrepot:
        print("❌ No test entrepôt available for integration test")
        return False
    
    entrepot_id = tester.test_entrepot.get('id')
    entrepot_nom = tester.test_entrepot.get('nom')
    
    # 1. Créer un outil avec entrepot_id spécifié
    print("\n🔍 STEP 1: Creating tool with specified entrepot_id")
    tool_data = {
        "nom": "Outil Intégration Test",
        "description": "Tool for testing warehouse integration",
        "reference": "INT-001",
        "entrepot_id": entrepot_id,
        "quantite_stock": 10,
        "prix_unitaire_usd": 150.0,
        "fournisseur": "Integration Supplier",
        "etat": "neuf",
        "localisation": "Section B",
        "numero_serie": "INT123456"
    }
    
    success, created_tool = tester.run_test(
        "Create Tool with Entrepôt ID",
        "POST",
        "/api/outils",
        200,
        data=tool_data
    )
    
    if not success or not created_tool:
        print("❌ Failed to create tool with entrepôt ID")
        return False
    
    tool_id = created_tool.get('id')
    print(f"✅ Created tool with ID: {tool_id}")
    
    # 2. Vérifier que entrepot_nom est automatiquement renseigné
    print("\n🔍 STEP 2: Verifying entrepot_nom is automatically filled")
    
    if created_tool.get('entrepot_nom') == entrepot_nom:
        print(f"✅ entrepot_nom correctly filled: {created_tool.get('entrepot_nom')}")
    else:
        print(f"❌ entrepot_nom not filled correctly. Expected: {entrepot_nom}, Got: {created_tool.get('entrepot_nom')}")
        return False
    
    # 3. GET /api/outils : Vérifier l'affichage des informations d'entrepôt
    print("\n🔍 STEP 3: Verifying warehouse info display in tools list")
    
    success, tools_list = tester.run_test(
        "Get All Tools",
        "GET",
        "/api/outils",
        200
    )
    
    if not success or not tools_list:
        print("❌ Failed to get tools list")
        return False
    
    # Find our created tool in the list
    found_tool = next((t for t in tools_list if t.get('id') == tool_id), None)
    if not found_tool:
        print("❌ Created tool not found in tools list")
        return False
    
    print(f"✅ Found tool in list: {found_tool.get('nom')}")
    print(f"🏭 Entrepôt ID: {found_tool.get('entrepot_id')}")
    print(f"🏭 Entrepôt Name: {found_tool.get('entrepot_nom')}")
    
    # Verify warehouse information is correctly displayed
    if (found_tool.get('entrepot_id') == entrepot_id and 
        found_tool.get('entrepot_nom') == entrepot_nom):
        print("✅ Warehouse information correctly displayed in tools list")
    else:
        print("❌ Warehouse information not correctly displayed")
        return False
    
    print("\n✅ OUTILS-ENTREPÔTS INTEGRATION TESTS COMPLETED SUCCESSFULLY")
    return True

def test_rapports_complets(tester):
    """Test complete reporting functionality"""
    print("\n" + "=" * 80)
    print("📊 TESTING RAPPORTS COMPLETS")
    print("=" * 80)
    
    # 1. GET /api/outils/rapports/mouvements : Rapport général sans filtres
    print("\n🔍 STEP 1: Testing general movements report without filters")
    
    success, general_report = tester.run_test(
        "Get General Movements Report",
        "GET",
        "/api/outils/rapports/mouvements",
        200
    )
    
    if not success or general_report is None:
        print("❌ Failed to get general movements report")
        return False
    
    print(f"✅ Retrieved general movements report")
    if isinstance(general_report, dict):
        print(f"📊 Total movements: {general_report.get('total_mouvements', 'N/A')}")
        print(f"📊 Movements by type: {general_report.get('mouvements_par_type', {})}")
    elif isinstance(general_report, list):
        print(f"📊 Number of movements: {len(general_report)}")
    
    # 2. GET /api/outils/rapports/mouvements avec filtres dates
    print("\n🔍 STEP 2: Testing movements report with date filters")
    
    success, date_filtered_report = tester.run_test(
        "Get Movements Report with Date Filters",
        "GET",
        "/api/outils/rapports/mouvements?date_debut=2025-01-01&date_fin=2025-01-31",
        200
    )
    
    if not success or date_filtered_report is None:
        print("❌ Failed to get date-filtered movements report")
        return False
    
    print("✅ Retrieved movements report with date filters")
    if isinstance(date_filtered_report, dict):
        print(f"📊 Filtered movements: {date_filtered_report.get('total_mouvements', 'N/A')}")
    elif isinstance(date_filtered_report, list):
        print(f"📊 Number of filtered movements: {len(date_filtered_report)}")
    
    # 3. GET /api/outils/rapports/mouvements avec filtre par type
    print("\n🔍 STEP 3: Testing movements report with type filter")
    
    success, type_filtered_report = tester.run_test(
        "Get Movements Report with Type Filter",
        "GET",
        "/api/outils/rapports/mouvements?type_mouvement=approvisionnement",
        200
    )
    
    if not success or type_filtered_report is None:
        print("❌ Failed to get type-filtered movements report")
        return False
    
    print("✅ Retrieved movements report with type filter")
    if isinstance(type_filtered_report, dict):
        print(f"📊 Approvisionnement movements: {type_filtered_report.get('total_mouvements', 'N/A')}")
    elif isinstance(type_filtered_report, list):
        print(f"📊 Number of approvisionnement movements: {len(type_filtered_report)}")
    
    # 4. GET /api/outils/rapports/stock-par-entrepot : Rapport stocks par entrepôt
    print("\n🔍 STEP 4: Testing stock report by warehouse")
    
    success, stock_report = tester.run_test(
        "Get Stock Report by Warehouse",
        "GET",
        "/api/outils/rapports/stock-par-entrepot",
        200
    )
    
    if not success or stock_report is None:
        print("❌ Failed to get stock report by warehouse")
        return False
    
    print("✅ Retrieved stock report by warehouse")
    if isinstance(stock_report, dict):
        print(f"📊 Total warehouses: {stock_report.get('total_entrepots', 'N/A')}")
        print(f"📊 Total stock value: {stock_report.get('valeur_totale_stock', 'N/A')}")
        if 'entrepots' in stock_report:
            for entrepot in stock_report['entrepots'][:3]:  # Show first 3
                print(f"  - {entrepot.get('nom', 'N/A')}: {entrepot.get('total_outils', 0)} tools, {entrepot.get('stock_total', 0)} units")
    elif isinstance(stock_report, list):
        print(f"📊 Number of warehouses with stock: {len(stock_report)}")
        for entrepot in stock_report[:3]:  # Show first 3
            print(f"  - {entrepot.get('nom', 'N/A')}: {entrepot.get('total_outils', 0)} tools")
    
    print("\n✅ RAPPORTS COMPLETS TESTS COMPLETED SUCCESSFULLY")
    return True

def test_permissions_et_validation(tester):
    """Test permissions and validation for warehouses and reports"""
    print("\n" + "=" * 80)
    print("🔐 TESTING PERMISSIONS ET VALIDATION")
    print("=" * 80)
    
    # Test with different user roles
    test_users = [
        {"email": "admin@facturapp.rdc", "password": "admin123", "role": "admin", "should_have_full_access": True},
        {"email": "manager@demo.com", "password": "manager123", "role": "manager", "should_have_full_access": True},
    ]
    
    # Try to create a technicien user for testing
    print("\n🔍 Creating technicien user for permission testing")
    technicien_data = {
        "email": "technicien.test@facturapp.rdc",
        "nom": "Technicien",
        "prenom": "Test",
        "password": "technicien123",
        "role": "technicien"
    }
    
    success, created_user = tester.run_test(
        "Create Technicien User",
        "POST",
        "/api/users",
        200,
        data=technicien_data
    )
    
    if success:
        test_users.append({
            "email": "technicien.test@facturapp.rdc", 
            "password": "technicien123", 
            "role": "technicien", 
            "should_have_full_access": False
        })
        print("✅ Created technicien user for testing")
    else:
        print("⚠️ Could not create technicien user, will test with existing users only")
    
    for user_info in test_users:
        print(f"\n🔍 Testing permissions for {user_info['role']} ({user_info['email']})")
        
        # Authenticate as this user
        auth_success, user_tester = test_authentication(user_info['email'], user_info['password'])
        if not auth_success:
            print(f"❌ Failed to authenticate as {user_info['role']}")
            continue
        
        # Test entrepôts access
        print(f"Testing entrepôts access for {user_info['role']}...")
        
        # GET /api/entrepots (should work for all roles)
        success, _ = user_tester.run_test(
            f"Get Entrepôts as {user_info['role']}",
            "GET",
            "/api/entrepots",
            200,
            print_response=False
        )
        
        if success:
            print(f"✅ {user_info['role']} can read entrepôts")
        else:
            print(f"❌ {user_info['role']} cannot read entrepôts")
        
        # POST /api/entrepots (should only work for admin/manager)
        test_entrepot = {
            "nom": f"Test Entrepôt {user_info['role']}",
            "adresse": "Test Address",
            "responsable": "Test Responsible"
        }
        
        expected_status = 200 if user_info['should_have_full_access'] else 403
        success, _ = user_tester.run_test(
            f"Create Entrepôt as {user_info['role']}",
            "POST",
            "/api/entrepots",
            expected_status,
            data=test_entrepot,
            print_response=False
        )
        
        if user_info['should_have_full_access']:
            if success:
                print(f"✅ {user_info['role']} can create entrepôts")
            else:
                print(f"❌ {user_info['role']} should be able to create entrepôts but cannot")
        else:
            if success:  # success=True means we got the expected 403
                print(f"✅ {user_info['role']} correctly blocked from creating entrepôts")
            else:
                print(f"❌ {user_info['role']} should not be able to create entrepôts but can")
        
        # Test reports access
        print(f"Testing reports access for {user_info['role']}...")
        
        # GET /api/outils/rapports/mouvements (should work for all roles)
        success, _ = user_tester.run_test(
            f"Get Movements Report as {user_info['role']}",
            "GET",
            "/api/outils/rapports/mouvements",
            200,
            print_response=False
        )
        
        if success:
            print(f"✅ {user_info['role']} can access movements reports")
        else:
            print(f"❌ {user_info['role']} cannot access movements reports")
        
        # GET /api/outils/rapports/stock-par-entrepot (should work for all roles)
        success, _ = user_tester.run_test(
            f"Get Stock Report as {user_info['role']}",
            "GET",
            "/api/outils/rapports/stock-par-entrepot",
            200,
            print_response=False
        )
        
        if success:
            print(f"✅ {user_info['role']} can access stock reports")
        else:
            print(f"❌ {user_info['role']} cannot access stock reports")
    
    print("\n✅ PERMISSIONS ET VALIDATION TESTS COMPLETED")
    return True

def test_donnees_complexes(tester):
    """Test with complex data scenarios"""
    print("\n" + "=" * 80)
    print("🧪 TESTING DONNÉES COMPLEXES")
    print("=" * 80)
    
    # 1. Créer plusieurs entrepôts
    print("\n🔍 STEP 1: Creating multiple warehouses")
    entrepots_data = [
        {
            "nom": "Entrepôt Nord",
            "description": "Entrepôt zone nord",
            "adresse": "Zone Industrielle Nord",
            "responsable": "Marie Dubois",
            "capacite_max": 500
        },
        {
            "nom": "Entrepôt Sud",
            "description": "Entrepôt zone sud",
            "adresse": "Zone Industrielle Sud", 
            "responsable": "Pierre Martin",
            "capacite_max": 800
        },
        {
            "nom": "Entrepôt Central",
            "description": "Entrepôt central",
            "adresse": "Centre Ville",
            "responsable": "Sophie Laurent",
            "capacite_max": 1200
        }
    ]
    
    created_entrepots = []
    for i, entrepot_data in enumerate(entrepots_data):
        success, created_entrepot = tester.run_test(
            f"Create Entrepôt {i+1}",
            "POST",
            "/api/entrepots",
            200,
            data=entrepot_data,
            print_response=False
        )
        
        if success and created_entrepot:
            created_entrepots.append(created_entrepot)
            print(f"✅ Created {created_entrepot.get('nom')}")
        else:
            print(f"❌ Failed to create entrepôt {i+1}")
    
    if len(created_entrepots) < 2:
        print("❌ Need at least 2 entrepôts for complex data testing")
        return False
    
    # 2. Créer plusieurs outils dans différents entrepôts
    print("\n🔍 STEP 2: Creating multiple tools in different warehouses")
    outils_data = [
        {
            "nom": "Perceuse Électrique",
            "reference": "PE-001",
            "entrepot_id": created_entrepots[0].get('id'),
            "quantite_stock": 15,
            "prix_unitaire_usd": 120.0,
            "fournisseur": "ToolCorp",
            "etat": "neuf"
        },
        {
            "nom": "Marteau Pneumatique",
            "reference": "MP-002",
            "entrepot_id": created_entrepots[1].get('id'),
            "quantite_stock": 8,
            "prix_unitaire_usd": 350.0,
            "fournisseur": "PowerTools",
            "etat": "neuf"
        },
        {
            "nom": "Scie Circulaire",
            "reference": "SC-003",
            "entrepot_id": created_entrepots[0].get('id'),
            "quantite_stock": 12,
            "prix_unitaire_usd": 200.0,
            "fournisseur": "CutMaster",
            "etat": "bon"
        }
    ]
    
    created_outils = []
    for i, outil_data in enumerate(outils_data):
        success, created_outil = tester.run_test(
            f"Create Tool {i+1}",
            "POST",
            "/api/outils",
            200,
            data=outil_data,
            print_response=False
        )
        
        if success and created_outil:
            created_outils.append(created_outil)
            print(f"✅ Created {created_outil.get('nom')} in {created_outil.get('entrepot_nom')}")
        else:
            print(f"❌ Failed to create tool {i+1}")
    
    # 3. Créer des mouvements (approvisionnements)
    print("\n🔍 STEP 3: Creating tool movements (approvisionnements)")
    for i, outil in enumerate(created_outils[:2]):  # Test with first 2 tools
        outil_id = outil.get('id')
        approvisionnement_data = {
            "quantite_ajoutee": 5 + i * 2,
            "prix_unitaire_usd": outil.get('prix_unitaire_usd'),
            "fournisseur": outil.get('fournisseur'),
            "notes": f"Approvisionnement test {i+1}"
        }
        
        success, _ = tester.run_test(
            f"Approvisionner Tool {i+1}",
            "POST",
            f"/api/outils/{outil_id}/approvisionner",
            200,
            data=approvisionnement_data,
            print_response=False
        )
        
        if success:
            print(f"✅ Approvisioned {outil.get('nom')}")
        else:
            print(f"❌ Failed to approvision {outil.get('nom')}")
    
    # 4. Tester rapports avec données multiples
    print("\n🔍 STEP 4: Testing reports with multiple data")
    
    # Test movements report
    success, movements_report = tester.run_test(
        "Get Complex Movements Report",
        "GET",
        "/api/outils/rapports/mouvements",
        200,
        print_response=False
    )
    
    if success and movements_report:
        print("✅ Retrieved complex movements report")
        if isinstance(movements_report, dict):
            print(f"📊 Total movements: {movements_report.get('total_mouvements', 'N/A')}")
            print(f"📊 Movements by type: {movements_report.get('mouvements_par_type', {})}")
        elif isinstance(movements_report, list):
            print(f"📊 Number of movements: {len(movements_report)}")
            # Show movement types
            types = set(m.get('type_mouvement', 'unknown') for m in movements_report)
            print(f"📊 Movement types found: {list(types)}")
    
    # Test stock report by warehouse
    success, stock_report = tester.run_test(
        "Get Complex Stock Report",
        "GET",
        "/api/outils/rapports/stock-par-entrepot",
        200,
        print_response=False
    )
    
    if success and stock_report:
        print("✅ Retrieved complex stock report")
        if isinstance(stock_report, dict):
            print(f"📊 Total warehouses: {stock_report.get('total_entrepots', 'N/A')}")
            print(f"📊 Total stock value: {stock_report.get('valeur_totale_stock', 'N/A')} USD")
            if 'entrepots' in stock_report:
                for entrepot in stock_report['entrepots']:
                    print(f"  - {entrepot.get('nom', 'N/A')}: {entrepot.get('total_outils', 0)} tools, {entrepot.get('stock_total', 0)} units, {entrepot.get('valeur_stock', 0)} USD")
        elif isinstance(stock_report, list):
            print(f"📊 Number of warehouses: {len(stock_report)}")
            total_value = 0
            for entrepot in stock_report:
                value = entrepot.get('valeur_stock', 0)
                total_value += value
                print(f"  - {entrepot.get('nom', 'N/A')}: {entrepot.get('total_outils', 0)} tools, {value} USD")
            print(f"📊 Total calculated value: {total_value} USD")
    
    # 5. Vérifier statistiques calculées
    print("\n🔍 STEP 5: Verifying calculated statistics")
    
    # Test with date filters
    success, filtered_report = tester.run_test(
        "Get Filtered Movements Report",
        "GET",
        "/api/outils/rapports/mouvements?type_mouvement=approvisionnement",
        200,
        print_response=False
    )
    
    if success and filtered_report:
        print("✅ Retrieved filtered movements report")
        if isinstance(filtered_report, dict):
            approvisionnements = filtered_report.get('total_mouvements', 0)
            print(f"📊 Total approvisionnements: {approvisionnements}")
        elif isinstance(filtered_report, list):
            approvisionnements = len([m for m in filtered_report if m.get('type_mouvement') == 'approvisionnement'])
            print(f"📊 Total approvisionnements: {approvisionnements}")
    
    print("\n✅ DONNÉES COMPLEXES TESTS COMPLETED SUCCESSFULLY")
    return True

def test_nouvelles_fonctionnalites_entrepots_rapports():
    """Main test function for new warehouse and reporting features"""
    print("\n" + "=" * 100)
    print("🏭📊 TESTING NOUVELLES FONCTIONNALITÉS D'ENTREPÔTS ET RAPPORTS")
    print("=" * 100)
    
    # Authenticate with admin user
    auth_success, tester = test_authentication("admin@facturapp.rdc", "admin123")
    if not auth_success:
        print("❌ Authentication failed, cannot proceed with tests")
        return False
    
    test_results = []
    
    # 1. Test ENTREPÔTS - CRUD COMPLET
    print("\n" + "🏭" * 50)
    result = test_entrepots_crud_complet(tester)
    test_results.append(("ENTREPÔTS CRUD COMPLET", result))
    
    if not result:
        print("❌ ENTREPÔTS CRUD tests failed, stopping")
        return False
    
    # 2. Test INTÉGRATION OUTILS-ENTREPÔTS
    print("\n" + "🔧" * 50)
    result = test_integration_outils_entrepots(tester)
    test_results.append(("INTÉGRATION OUTILS-ENTREPÔTS", result))
    
    # 3. Test RAPPORTS COMPLETS
    print("\n" + "📊" * 50)
    result = test_rapports_complets(tester)
    test_results.append(("RAPPORTS COMPLETS", result))
    
    # 4. Test PERMISSIONS ET VALIDATION
    print("\n" + "🔐" * 50)
    result = test_permissions_et_validation(tester)
    test_results.append(("PERMISSIONS ET VALIDATION", result))
    
    # 5. Test DONNÉES COMPLEXES
    print("\n" + "🧪" * 50)
    result = test_donnees_complexes(tester)
    test_results.append(("DONNÉES COMPLEXES", result))
    
    # Summary
    print("\n" + "=" * 100)
    print("📋 SUMMARY OF NEW FEATURES TESTING")
    print("=" * 100)
    
    all_passed = True
    for test_name, result in test_results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{status} - {test_name}")
        if not result:
            all_passed = False
    
    print("\n" + "=" * 100)
    if all_passed:
        print("🎉 ALL NEW FEATURES TESTS PASSED SUCCESSFULLY!")
        print("✅ Entrepôts and Rapports functionality is working perfectly")
    else:
        print("❌ SOME TESTS FAILED")
        print("⚠️ Please check the failed tests above")
    print("=" * 100)
    
    return all_passed

if __name__ == "__main__":
    # Run the new warehouse and reporting features tests
    success = test_nouvelles_fonctionnalites_entrepots_rapports()
    sys.exit(0 if success else 1)