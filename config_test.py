import requests
import sys
import json
import base64
from datetime import datetime

class ConfigTester:
    def __init__(self, base_url="https://be939dd3-4538-4330-b115-17422fd00276.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.admin_token = None
        self.manager_token = None
        self.comptable_token = None
        self.user_token = None

    def run_test(self, name, method, endpoint, expected_status, data=None, token=None, print_response=True):
        """Run a single API test"""
        url = f"{self.base_url}{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = f'Bearer {token}'

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
                if print_response:
                    try:
                        print(f"Response: {json.dumps(response.json(), indent=2)}")
                    except:
                        print(f"Response: {response.text}")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    print(f"Error: {json.dumps(response.json(), indent=2)}")
                except:
                    print(f"Error: {response.text}")

            try:
                return success, response.json()
            except:
                return success, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def login(self, email, password):
        """Login and get token"""
        success, response = self.run_test(
            f"Login as {email}",
            "POST",
            "/api/auth/login",
            200,
            data={"email": email, "password": password}
        )
        if success and 'access_token' in response:
            return response['access_token']
        return None

    def login_all_users(self):
        """Login with all user types"""
        self.admin_token = self.login("admin@facturapp.rdc", "admin123")
        self.manager_token = self.login("manager@demo.com", "manager123")
        self.comptable_token = self.login("comptable@demo.com", "comptable123")
        self.user_token = self.login("user@demo.com", "user123")
        
        if self.admin_token:
            print("✅ Admin login successful")
        else:
            print("❌ Admin login failed")
            
        if self.manager_token:
            print("✅ Manager login successful")
        else:
            print("❌ Manager login failed")
            
        if self.comptable_token:
            print("✅ Comptable login successful")
        else:
            print("❌ Comptable login failed")
            
        if self.user_token:
            print("✅ User login successful")
        else:
            print("❌ User login failed")

    def test_config_access(self):
        """Test access to configuration endpoints"""
        print("\n🔍 Testing configuration access permissions...")
        
        # Admin should have access
        success, _ = self.run_test(
            "Admin access to config",
            "GET",
            "/api/config",
            200,
            token=self.admin_token
        )
        
        # Manager should NOT have access
        success, _ = self.run_test(
            "Manager access to config (should fail)",
            "GET",
            "/api/config",
            403,  # or 401 depending on implementation
            token=self.manager_token
        )
        
        # Comptable should NOT have access
        success, _ = self.run_test(
            "Comptable access to config (should fail)",
            "GET",
            "/api/config",
            403,  # or 401 depending on implementation
            token=self.comptable_token
        )
        
        # Regular user should NOT have access
        success, _ = self.run_test(
            "User access to config (should fail)",
            "GET",
            "/api/config",
            403,  # or 401 depending on implementation
            token=self.user_token
        )

    def test_app_config(self):
        """Test app configuration update"""
        print("\n🔍 Testing app configuration update...")
        
        # Update app configuration
        config_data = {
            "appName": "FacturApp Test",
            "theme": "dark",
            "language": "en"
        }
        
        success, _ = self.run_test(
            "Update app configuration",
            "PUT",
            "/api/config/app",
            200,
            data=config_data,
            token=self.admin_token
        )
        
        # Verify configuration was updated
        success, response = self.run_test(
            "Get updated configuration",
            "GET",
            "/api/config",
            200,
            token=self.admin_token,
            print_response=True
        )
        
        if success:
            config_valid = (
                response.get("appName") == config_data["appName"] and
                response.get("theme") == config_data["theme"] and
                response.get("language") == config_data["language"]
            )
            
            if config_valid:
                print("✅ Configuration updated successfully")
            else:
                print("❌ Configuration not updated correctly")
                print(f"Expected: {config_data}")
                print(f"Got: {response}")

    def test_logo_upload(self):
        """Test logo upload functionality"""
        print("\n🔍 Testing logo upload...")
        
        # Create a simple base64 image for testing
        # This is a 1x1 transparent pixel
        sample_image = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
        
        logo_data = {
            "logo": sample_image,
            "filename": "test_logo.png"
        }
        
        success, response = self.run_test(
            "Upload logo",
            "POST",
            "/api/config/logo",
            200,
            data=logo_data,
            token=self.admin_token
        )
        
        if success:
            print("✅ Logo upload successful")
        else:
            print("❌ Logo upload failed")

    def test_user_management(self):
        """Test user management functionality"""
        print("\n🔍 Testing user management...")
        
        # Get all users
        success, users_response = self.run_test(
            "Get all users",
            "GET",
            "/api/users",
            200,
            token=self.admin_token
        )
        
        if not success or not users_response:
            print("❌ Failed to get users")
            return
            
        # Find a non-admin user to modify
        test_user = None
        for user in users_response:
            if user.get("role") != "admin" and user.get("email") != "admin@facturapp.rdc":
                test_user = user
                break
                
        if not test_user:
            print("❌ No suitable test user found")
            return
            
        print(f"🔍 Selected test user: {test_user.get('email')}")
        
        # Test changing user role
        original_role = test_user.get("role")
        new_role = "comptable" if original_role != "comptable" else "utilisateur"
        
        success, _ = self.run_test(
            f"Change user role from {original_role} to {new_role}",
            "PUT",
            f"/api/users/{test_user.get('id')}/role",
            200,
            data={"role": new_role},
            token=self.admin_token
        )
        
        # Test toggling user status
        original_status = test_user.get("is_active", True)
        
        success, _ = self.run_test(
            f"Toggle user status from {original_status} to {not original_status}",
            "PUT",
            f"/api/users/{test_user.get('id')}/status",
            200,
            data={"is_active": not original_status},
            token=self.admin_token
        )
        
        # Restore original values
        self.run_test(
            "Restore original role",
            "PUT",
            f"/api/users/{test_user.get('id')}/role",
            200,
            data={"role": original_role},
            token=self.admin_token
        )
        
        self.run_test(
            "Restore original status",
            "PUT",
            f"/api/users/{test_user.get('id')}/status",
            200,
            data={"is_active": original_status},
            token=self.admin_token
        )

def main():
    print(f"🔧 Testing FacturApp Configuration")
    
    tester = ConfigTester()
    
    # Login with different user types
    tester.login_all_users()
    
    # Test configuration access
    tester.test_config_access()
    
    # Test app configuration
    tester.test_app_config()
    
    # Test logo upload
    tester.test_logo_upload()
    
    # Test user management
    tester.test_user_management()
    
    # Print results
    print(f"\n📊 Tests passed: {tester.tests_passed}/{tester.tests_run}")
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())