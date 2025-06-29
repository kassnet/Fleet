import requests
import sys
import json
from datetime import datetime

class FactureProTester:
    def __init__(self, base_url="https://3f83a5b3-5c70-4e1a-8b47-a7e6128d64d2.preview.emergentagent.com"):
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
    
    # 5. Test payment simulation - Testing "Simulation de paiements"
    print("\n🔍 STEP 5: Testing payment simulation (Testing 'Simulation de paiements')")
    print("This tests the $or query for MongoDB IDs in simulate_payment function")
    payment_ok = tester.test_simulate_payment()
    if not payment_ok:
        print("❌ Payment simulation failed - This was a known issue with ID handling")
    else:
        print("✅ Payment simulation successful - The ID handling issue appears to be fixed")
    
    # 6. Test marking invoice as paid - Testing "Marquage factures comme payées"
    print("\n🔍 STEP 6: Testing marking invoice as paid (Testing 'Marquage factures comme payées')")
    print("This tests the $or query for MongoDB IDs in marquer_payee function")
    
    # Even if payment simulation failed, try to mark as paid directly
    if not payment_ok:
        print("⚠️ Payment simulation failed, but still testing direct marking as paid...")
    
    paid_ok = tester.test_mark_invoice_paid()
    if not paid_ok:
        print("❌ Marking invoice as paid failed - This was a known issue with ID handling")
    else:
        print("✅ Marking invoice as paid successful - The ID handling issue appears to be fixed")
    
    # 7. Test multi-currency calculations - Testing "Calculs multi-devises USD/FC"
    print("\n🔍 STEP 7: Testing multi-currency calculations (Testing 'Calculs multi-devises USD/FC')")
    
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
    
    # 8. Test stock management if applicable
    print("\n🔍 STEP 8: Testing stock management")
    if tester.test_product and tester.test_product.get('gestion_stock'):
        # Check if stock was updated after invoice creation
        _, product = tester.run_test(
            "Check Stock After Invoice",
            "GET",
            f"/api/produits/{tester.test_product.get('id')}",
            200
        )
        
        if product:
            initial_stock = tester.test_product.get('stock_actuel', 0)
            current_stock = product.get('stock_actuel', 0)
            expected_stock = initial_stock - 2  # We ordered 2 in test_create_invoice
            
            if current_stock == expected_stock:
                print(f"✅ Stock was correctly updated: {initial_stock} → {current_stock}")
            else:
                print(f"❌ Stock was not correctly updated: {initial_stock} → {current_stock} (expected {expected_stock})")
    else:
        print("ℹ️ Test product does not have stock management enabled, skipping stock tests")
    
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
    print(f"✅ 'Simulation de paiements': {'Fixed' if payment_ok else 'Still has issues'}")
    print(f"✅ 'Marquage factures comme payées': {'Fixed' if paid_ok else 'Still has issues'}")
    print(f"✅ 'Calculs multi-devises USD/FC': {'Working correctly' if taux and taux.get('taux') == 2800.0 else 'Has issues'}")
    
    return tester.tests_passed == tester.tests_run

def main():
    # Run specific issue tests based on test_result.md
    specific_tests_ok = test_specific_issues()
    
    # Print overall results
    print("\n" + "=" * 80)
    print(f"📊 OVERALL TEST RESULT: {'✅ PASSED' if specific_tests_ok else '❌ FAILED'}")
    print("=" * 80)
    
    return 0 if specific_tests_ok else 1

if __name__ == "__main__":
    sys.exit(main())