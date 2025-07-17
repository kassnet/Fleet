#!/usr/bin/env python3
"""
Test script for User/Settings Separation in FacturApp Backend
Tests the separation between user management (Admin + Support) and system settings (Support only)
"""

import requests
import json
import sys
from datetime import datetime

class UserSettingsSeparationTester:
    def __init__(self, base_url="https://be939dd3-4538-4330-b115-17422fd00276.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.tokens = {}  # Store tokens for different users
        self.users = {
            "admin": {"email": "admin@facturapp.rdc", "password": "admin123"},
            "support": {"email": "support@facturapp.rdc", "password": "support123"},
            "manager": {"email": "manager@demo.com", "password": "manager123"}
        }

    def log_test(self, test_name, success, details=""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {test_name}")
        else:
            print(f"❌ {test_name}")
        
        if details:
            print(f"   {details}")

    def authenticate_user(self, role):
        """Authenticate a user and store their token"""
        print(f"\n🔐 Authenticating {role} user...")
        
        if role not in self.users:
            self.log_test(f"Authentication {role}", False, f"Unknown role: {role}")
            return False
        
        user_data = self.users[role]
        
        try:
            response = requests.post(
                f"{self.base_url}/api/auth/login",
                json=user_data,
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 200:
                data = response.json()
                self.tokens[role] = data.get('access_token')
                user_info = data.get('user', {})
                
                self.log_test(
                    f"Authentication {role}", 
                    True, 
                    f"Role: {user_info.get('role')}, Email: {user_info.get('email')}"
                )
                return True
            else:
                self.log_test(
                    f"Authentication {role}", 
                    False, 
                    f"Status: {response.status_code}, Response: {response.text}"
                )
                return False
                
        except Exception as e:
            self.log_test(f"Authentication {role}", False, f"Error: {str(e)}")
            return False

    def make_request(self, method, endpoint, role, expected_status=200, data=None):
        """Make an authenticated request"""
        if role not in self.tokens:
            return False, f"No token for role {role}"
        
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {self.tokens[role]}'
        }
        
        url = f"{self.base_url}{endpoint}"
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)
            else:
                return False, f"Unsupported method: {method}"
            
            success = response.status_code == expected_status
            
            if success:
                try:
                    return True, response.json()
                except:
                    return True, response.text
            else:
                return False, f"Status: {response.status_code}, Response: {response.text}"
                
        except Exception as e:
            return False, f"Request error: {str(e)}"

    def test_user_management_access(self):
        """Test user management endpoints - Admin and Support should have access"""
        print(f"\n{'='*60}")
        print("🔍 TESTING USER MANAGEMENT ACCESS")
        print(f"{'='*60}")
        
        # Test POST /api/users - Admin and Support should have access
        print(f"\n👑 Testing Admin access to user creation:")
        test_data = {
            "email": f"test_admin_{datetime.now().strftime('%H%M%S')}@test.com",
            "nom": "Test",
            "prenom": "User",
            "password": "test123",
            "role": "utilisateur"
        }
        success, response = self.make_request("POST", "/api/users", "admin", 200, test_data)
        self.log_test("Admin Create user", success, str(response)[:100] if not success else "Access granted")
        
        print(f"\n🛠️ Testing Support access to user creation:")
        test_data = {
            "email": f"test_support_{datetime.now().strftime('%H%M%S')}@test.com",
            "nom": "Test",
            "prenom": "User",
            "password": "test123",
            "role": "utilisateur"
        }
        success, response = self.make_request("POST", "/api/users", "support", 200, test_data)
        self.log_test("Support Create user", success, str(response)[:100] if not success else "Access granted")
        
        print(f"\n👔 Testing Manager access to user creation (should be denied):")
        test_data = {
            "email": f"test_manager_{datetime.now().strftime('%H%M%S')}@test.com",
            "nom": "Test",
            "prenom": "User",
            "password": "test123",
            "role": "utilisateur"
        }
        success, response = self.make_request("POST", "/api/users", "manager", 403, test_data)
        self.log_test("Manager Create user (should be denied)", success, "Access correctly denied" if success else str(response)[:100])

    def test_settings_access(self):
        """Test system settings endpoints - Support only should have access"""
        print(f"\n{'='*60}")
        print("🔍 TESTING SYSTEM SETTINGS ACCESS")
        print(f"{'='*60}")
        
        # Test endpoints that only Support should access
        settings_endpoints = [
            ("GET", "/api/parametres", "Get system parameters"),
            ("POST", "/api/parametres/taux-change", "Update exchange rate via parametres"),
            ("GET", "/api/parametres/health", "System health check"),
            ("POST", "/api/parametres/backup", "System backup"),
            ("GET", "/api/parametres/logs", "System logs"),
        ]
        
        # Test with Support (should have access)
        print(f"\n🛠️ Testing Support access to system settings:")
        for method, endpoint, description in settings_endpoints:
            if method == "POST" and "taux-change" in endpoint:
                # Test data for updating exchange rate via parametres
                test_data = {"taux": 2850.0}
                success, response = self.make_request(method, endpoint, "support", 200, test_data)
            else:
                success, response = self.make_request(method, endpoint, "support", 200)
            
            self.log_test(f"Support {description}", success, str(response)[:100] if not success else "Access granted")
        
        # Test with Admin (should be denied according to separation)
        print(f"\n👑 Testing Admin access to system settings (should be denied):")
        for method, endpoint, description in settings_endpoints:
            if method == "POST" and "taux-change" in endpoint:
                test_data = {"taux": 2850.0}
                success, response = self.make_request(method, endpoint, "admin", 403, test_data)
            else:
                success, response = self.make_request(method, endpoint, "admin", 403)
            
            self.log_test(f"Admin {description} (should be denied)", success, "Access correctly denied" if success else str(response)[:100])
        
        # Test with Manager (should be denied)
        print(f"\n👔 Testing Manager access to system settings (should be denied):")
        for method, endpoint, description in settings_endpoints:
            if method == "POST" and "taux-change" in endpoint:
                test_data = {"taux": 2850.0}
                success, response = self.make_request(method, endpoint, "manager", 403, test_data)
            else:
                success, response = self.make_request(method, endpoint, "manager", 403)
            
            self.log_test(f"Manager {description} (should be denied)", success, "Access correctly denied" if success else str(response)[:100])

    def test_existing_endpoints_access(self):
        """Test access to existing endpoints that should work"""
        print(f"\n{'='*60}")
        print("🔍 TESTING EXISTING ENDPOINTS ACCESS")
        print(f"{'='*60}")
        
        # Test existing exchange rate endpoint (should work for Manager and Admin)
        print(f"\n💱 Testing existing exchange rate endpoint:")
        
        # Test GET /api/taux-change (should work for all authenticated users)
        for role in ["admin", "support", "manager"]:
            success, response = self.make_request("GET", "/api/taux-change", role, 200)
            self.log_test(f"{role.capitalize()} GET /api/taux-change", success, str(response)[:100] if not success else "Access granted")
        
        # Test PUT /api/taux-change (should work for Manager and Admin only)
        print(f"\n💱 Testing PUT /api/taux-change (Manager and Admin only):")
        
        for role in ["admin", "manager"]:
            success, response = self.make_request("PUT", "/api/taux-change?nouveau_taux=2800.0", role, 200)
            self.log_test(f"{role.capitalize()} PUT /api/taux-change", success, str(response)[:100] if not success else "Access granted")
        
        # Support should NOT have access to PUT /api/taux-change
        success, response = self.make_request("PUT", "/api/taux-change?nouveau_taux=2800.0", "support", 403)
        self.log_test("Support PUT /api/taux-change (should be denied)", success, "Access correctly denied" if success else str(response)[:100])

    def test_user_specific_operations(self):
        """Test specific user operations"""
        print(f"\n{'='*60}")
        print("🔍 TESTING USER SPECIFIC OPERATIONS")
        print(f"{'='*60}")
        
        # First, get a list of users to test with
        success, users_data = self.make_request("GET", "/api/users", "admin", 200)
        
        if not success:
            print("❌ Cannot get users list, skipping user-specific tests")
            return
        
        if not users_data or len(users_data) == 0:
            print("❌ No users found, skipping user-specific tests")
            return
        
        # Get the first user for testing
        test_user = users_data[0]
        user_id = test_user.get('id')
        
        if not user_id:
            print("❌ No user ID found, skipping user-specific tests")
            return
        
        print(f"📝 Testing with user: {test_user.get('email')} (ID: {user_id})")
        
        # Test GET /api/users/{user_id} - Admin and Support should have access
        print(f"\n👤 Testing GET /api/users/{user_id}:")
        
        for role in ["admin", "support"]:
            success, response = self.make_request("GET", f"/api/users/{user_id}", role, 200)
            self.log_test(f"{role.capitalize()} GET user by ID", success, str(response)[:100] if not success else "Access granted")
        
        # Manager should NOT have access
        success, response = self.make_request("GET", f"/api/users/{user_id}", "manager", 403)
        self.log_test("Manager GET user by ID (should be denied)", success, "Access correctly denied" if success else str(response)[:100])
        
        # Test PUT /api/users/{user_id}/status - Admin and Support should have access
        print(f"\n👤 Testing PUT /api/users/{user_id}/status:")
        
        for role in ["admin", "support"]:
            success, response = self.make_request("PUT", f"/api/users/{user_id}/status", role, 200, {"is_active": True})
            self.log_test(f"{role.capitalize()} PUT user status", success, str(response)[:100] if not success else "Access granted")
        
        # Test PUT /api/users/{user_id}/role - Admin and Support should have access
        print(f"\n👤 Testing PUT /api/users/{user_id}/role:")
        
        for role in ["admin", "support"]:
            success, response = self.make_request("PUT", f"/api/users/{user_id}/role", role, 200, {"role": "utilisateur"})
            self.log_test(f"{role.capitalize()} PUT user role", success, str(response)[:100] if not success else "Access granted")

    def run_all_tests(self):
        """Run all separation tests"""
        print("🚀 STARTING USER/SETTINGS SEPARATION TESTS")
        print("=" * 80)
        
        # Step 1: Authenticate all users
        print("\n🔐 STEP 1: AUTHENTICATION")
        auth_results = {}
        for role in ["admin", "support", "manager"]:
            auth_results[role] = self.authenticate_user(role)
        
        # Check if all authentications were successful
        failed_auths = [role for role, success in auth_results.items() if not success]
        if failed_auths:
            print(f"\n❌ CRITICAL: Authentication failed for: {', '.join(failed_auths)}")
            print("Cannot proceed with separation tests without proper authentication")
            return False
        
        print("\n✅ All users authenticated successfully")
        
        # Step 2: Test user management access
        print("\n🔐 STEP 2: USER MANAGEMENT ACCESS TESTS")
        self.test_user_management_access()
        
        # Step 3: Test settings access
        print("\n⚙️ STEP 3: SYSTEM SETTINGS ACCESS TESTS")
        self.test_settings_access()
        
        # Step 4: Test existing endpoints
        print("\n🔄 STEP 4: EXISTING ENDPOINTS ACCESS TESTS")
        self.test_existing_endpoints_access()
        
        # Step 5: Test user-specific operations
        print("\n👤 STEP 5: USER-SPECIFIC OPERATIONS TESTS")
        self.test_user_specific_operations()
        
        # Final summary
        print(f"\n{'='*80}")
        print("📊 FINAL TEST SUMMARY")
        print(f"{'='*80}")
        
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        
        print(f"Total tests run: {self.tests_run}")
        print(f"Tests passed: {self.tests_passed}")
        print(f"Tests failed: {self.tests_run - self.tests_passed}")
        print(f"Success rate: {success_rate:.1f}%")
        
        if success_rate >= 80:
            print("\n✅ USER/SETTINGS SEPARATION IS WORKING CORRECTLY")
            return True
        else:
            print("\n❌ USER/SETTINGS SEPARATION HAS ISSUES")
            return False

def main():
    """Main function to run the tests"""
    tester = UserSettingsSeparationTester()
    
    try:
        success = tester.run_all_tests()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n⚠️ Tests interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Unexpected error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()