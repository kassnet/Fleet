import requests
import sys
import json
from datetime import datetime

class SalesModuleTester:
    def __init__(self, base_url="https://d49f146a-1c74-4ae7-997f-d63e95bc382e.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.token = None
        self.headers = {'Content-Type': 'application/json'}
        self.user_role = None

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

    def authenticate(self, email, password):
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
            self.token = response["access_token"]
            self.headers = {
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {self.token}'
            }
            self.user_role = response.get("user", {}).get("role")
            print(f"👤 User role: {self.user_role}")
            return True
        else:
            print(f"❌ Failed to authenticate with {email}")
            return False

    def test_devis_endpoint(self):
        """Test the devis endpoint"""
        success, data = self.run_test("Devis List", "GET", "/api/devis")
        if success:
            print(f"📋 Number of devis: {len(data)}")
            for devis in data[:2]:  # Show only first 2 devis if any
                print(f"  - {devis.get('numero')} - Client: {devis.get('client_nom')} - Status: {devis.get('statut')}")
        return success

    def test_opportunites_endpoint(self):
        """Test the opportunites endpoint"""
        success, data = self.run_test("Opportunites List", "GET", "/api/opportunites")
        if success:
            print(f"🎯 Number of opportunites: {len(data)}")
            for opportunite in data[:2]:  # Show only first 2 opportunites if any
                print(f"  - {opportunite.get('titre')} - Client: {opportunite.get('client_nom')} - Étape: {opportunite.get('etape')}")
        return success

    def test_commandes_endpoint(self):
        """Test the commandes endpoint"""
        success, data = self.run_test("Commandes List", "GET", "/api/commandes")
        if success:
            print(f"🛒 Number of commandes: {len(data)}")
            for commande in data[:2]:  # Show only first 2 commandes if any
                print(f"  - {commande.get('numero')} - Client: {commande.get('client_nom')} - Status: {commande.get('statut')}")
        return success

    def test_vente_stats_endpoint(self):
        """Test the vente/stats endpoint"""
        success, data = self.run_test("Vente Stats", "GET", "/api/vente/stats")
        if success:
            print(f"📊 Vente Stats:")
            print(f"  - Total devis: {data.get('total_devis')}")
            print(f"  - Taux conversion devis: {data.get('taux_conversion_devis')}%")
            print(f"  - Opportunités en cours: {data.get('opportunites_en_cours')}")
            print(f"  - Valeur pipeline USD: ${data.get('valeur_pipeline_usd')}")
        return success

    def test_permissions(self, email, password, expected_access=True):
        """Test permissions for a specific user"""
        print(f"\n==== Testing permissions for {email} ====")
        
        # Authenticate with the user
        if not self.authenticate(email, password):
            print(f"❌ Authentication failed for {email}")
            return False
        
        # Expected status code based on expected access
        expected_status = 200 if expected_access else 403
        
        # Test all sales endpoints
        devis_success, _ = self.run_test("Devis Access", "GET", "/api/devis", expected_status)
        opportunites_success, _ = self.run_test("Opportunites Access", "GET", "/api/opportunites", expected_status)
        commandes_success, _ = self.run_test("Commandes Access", "GET", "/api/commandes", expected_status)
        stats_success, _ = self.run_test("Vente Stats Access", "GET", "/api/vente/stats", expected_status)
        
        # Check if all access matches expectations
        all_match = (
            devis_success and 
            opportunites_success and 
            commandes_success and 
            stats_success
        )
        
        if all_match:
            print(f"✅ All permissions correctly enforced for {email}")
        else:
            print(f"❌ Some permissions not correctly enforced for {email}")
        
        return all_match

def main():
    tester = SalesModuleTester()
    
    # Test with admin user (should have access)
    admin_ok = tester.test_permissions("admin@facturapp.rdc", "admin123", expected_access=True)
    
    # Test with manager user (should have access)
    manager_ok = tester.test_permissions("manager@demo.com", "manager123", expected_access=True)
    
    # Test with comptable user (should NOT have access)
    comptable_ok = tester.test_permissions("comptable@demo.com", "comptable123", expected_access=False)
    
    # Print summary
    print("\n" + "=" * 80)
    print("📊 SALES MODULE PERMISSIONS TEST SUMMARY:")
    print("=" * 80)
    print(f"Admin Access: {'✅ PASSED' if admin_ok else '❌ FAILED'}")
    print(f"Manager Access: {'✅ PASSED' if manager_ok else '❌ FAILED'}")
    print(f"Comptable Access Restriction: {'✅ PASSED' if comptable_ok else '❌ FAILED'}")
    
    # Test detailed functionality with admin user
    if admin_ok:
        print("\n" + "=" * 80)
        print("📊 TESTING SALES MODULE FUNCTIONALITY WITH ADMIN:")
        print("=" * 80)
        
        # Authenticate again with admin
        tester.authenticate("admin@facturapp.rdc", "admin123")
        
        # Test all endpoints
        devis_ok = tester.test_devis_endpoint()
        opportunites_ok = tester.test_opportunites_endpoint()
        commandes_ok = tester.test_commandes_endpoint()
        stats_ok = tester.test_vente_stats_endpoint()
        
        print("\n" + "=" * 80)
        print("📊 SALES MODULE FUNCTIONALITY TEST SUMMARY:")
        print("=" * 80)
        print(f"Devis Endpoint: {'✅ PASSED' if devis_ok else '❌ FAILED'}")
        print(f"Opportunites Endpoint: {'✅ PASSED' if opportunites_ok else '❌ FAILED'}")
        print(f"Commandes Endpoint: {'✅ PASSED' if commandes_ok else '❌ FAILED'}")
        print(f"Vente Stats Endpoint: {'✅ PASSED' if stats_ok else '❌ FAILED'}")
        
        all_functionality_ok = devis_ok and opportunites_ok and commandes_ok and stats_ok
        print(f"\nOverall Functionality: {'✅ PASSED' if all_functionality_ok else '❌ FAILED'}")
    
    # Overall result
    overall_ok = admin_ok and manager_ok and comptable_ok
    if admin_ok:
        overall_ok = overall_ok and all_functionality_ok
    
    print("\n" + "=" * 80)
    print(f"📊 FINAL RESULT: {'✅ PASSED' if overall_ok else '❌ FAILED'}")
    print("=" * 80)
    
    return 0 if overall_ok else 1

if __name__ == "__main__":
    sys.exit(main())