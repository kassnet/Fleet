import requests
import sys
import os
import json

class FacturAppLoginTester:
    def __init__(self, base_url=None):
        self.base_url = base_url or os.environ.get('REACT_APP_BACKEND_URL', 'https://122fd5ed-f22e-4bd5-80c6-6f62870e625e.preview.emergentagent.com')
        self.tests_run = 0
        self.tests_passed = 0
        
        print(f"Using URL: {self.base_url}")

    def run_test(self, name, test_function, *args, **kwargs):
        """Run a single test"""
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            result = test_function(*args, **kwargs)
            if result:
                self.tests_passed += 1
                print(f"✅ Passed - {name}")
            else:
                print(f"❌ Failed - {name}")
            return result
        except Exception as e:
            print(f"❌ Failed - {name} - Error: {str(e)}")
            return False

    def test_api_login(self, email, password):
        """Test login API functionality"""
        try:
            response = requests.post(
                f"{self.base_url}/api/auth/login",
                json={"email": email, "password": password}
            )
            
            if response.status_code == 200:
                data = response.json()
                if "access_token" in data and "user" in data:
                    print(f"✅ API Login successful for {email}, role: {data['user']['role']}")
                    return True
            
            print(f"❌ API Login failed for {email}: {response.status_code}")
            print(f"Response: {response.text}")
            return False
        except Exception as e:
            print(f"❌ API Login error: {str(e)}")
            return False
            
    def test_all_demo_accounts(self):
        """Test all demo accounts"""
        demo_accounts = [
            {"email": "admin@facturapp.rdc", "password": "admin123", "role": "admin"},
            {"email": "manager@demo.com", "password": "manager123", "role": "manager"},
            {"email": "comptable@demo.com", "password": "comptable123", "role": "comptable"},
            {"email": "user@demo.com", "password": "user123", "role": "utilisateur"}
        ]
        
        all_passed = True
        for account in demo_accounts:
            result = self.test_api_login(account["email"], account["password"])
            if not result:
                all_passed = False
                
        return all_passed

def main():
    # Setup
    tester = FacturAppLoginTester()
    
    # Test admin login via API
    admin_login_success = tester.run_test(
        "Admin Login via API",
        tester.test_api_login,
        "admin@facturapp.rdc",
        "admin123"
    )
    
    # Print results
    print(f"\n📊 Tests passed: {tester.tests_passed}/{tester.tests_run}")
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())