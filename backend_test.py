#!/usr/bin/env python3
"""
Backend API Testing for Auris Application
Tests all authentication, user configuration, and file processing endpoints
"""

import requests
import sys
import json
import tempfile
import os
from datetime import datetime

class AurisAPITester:
    def __init__(self, base_url="http://localhost:5000"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_user_data = {
            "nombre_usuario": "test_user",
            "correo_electronico": "test@test.com", 
            "contraseña": "123456"
        }

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if files:
                # Remove Content-Type for file uploads
                headers.pop('Content-Type', None)
                
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                if files:
                    response = requests.post(url, files=files, headers=headers)
                else:
                    response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)}")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {json.dumps(error_data, indent=2)}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test health check endpoint"""
        return self.run_test("Health Check", "GET", "health", 200)

    def test_register_user(self):
        """Test user registration"""
        success, response = self.run_test(
            "User Registration",
            "POST", 
            "api/register",
            201,
            data=self.test_user_data
        )
        if success and 'user_id' in response:
            self.user_id = response['user_id']
            print(f"   User ID: {self.user_id}")
        return success

    def test_login_user(self):
        """Test user login and get token"""
        login_data = {
            "correo_electronico": self.test_user_data["correo_electronico"],
            "contraseña": self.test_user_data["contraseña"]
        }
        success, response = self.run_test(
            "User Login",
            "POST",
            "api/login", 
            200,
            data=login_data
        )
        if success and 'token' in response:
            self.token = response['token']
            print(f"   Token received: {self.token[:20]}...")
            return True
        return False

    def test_get_user_config(self):
        """Test getting user configuration"""
        return self.run_test(
            "Get User Config",
            "GET",
            "api/user/config",
            200
        )

    def test_update_user_config(self):
        """Test updating user configuration"""
        config_data = {
            "tipo_voz": "hombre",
            "velocidad_lectura": 1.5,
            "tamaño_fuente": "large",
            "contraste_alto": True,
            "retroalimentacion_audio": False
        }
        return self.run_test(
            "Update User Config",
            "PUT",
            "api/user/config",
            200,
            data=config_data
        )

    def test_file_upload_txt(self):
        """Test text file upload"""
        # Create a temporary text file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
            f.write("Este es un texto de prueba para el asistente Auris.\nSegunda línea del documento.")
            temp_file_path = f.name

        try:
            with open(temp_file_path, 'rb') as f:
                files = {'file': ('test.txt', f, 'text/plain')}
                success, response = self.run_test(
                    "File Upload (TXT)",
                    "POST",
                    "leer-archivo",
                    200,
                    files=files
                )
            return success
        finally:
            os.unlink(temp_file_path)

    def test_invalid_login(self):
        """Test login with invalid credentials"""
        invalid_data = {
            "correo_electronico": "invalid@test.com",
            "contraseña": "wrongpassword"
        }
        return self.run_test(
            "Invalid Login",
            "POST",
            "api/login",
            401,
            data=invalid_data
        )

    def test_unauthorized_access(self):
        """Test accessing protected endpoint without token"""
        # Temporarily remove token
        original_token = self.token
        self.token = None
        
        success, _ = self.run_test(
            "Unauthorized Access",
            "GET",
            "api/user/config",
            401
        )
        
        # Restore token
        self.token = original_token
        return success

    def test_duplicate_registration(self):
        """Test registering with existing email"""
        return self.run_test(
            "Duplicate Registration",
            "POST",
            "api/register",
            409,
            data=self.test_user_data
        )

    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting Auris Backend API Tests")
        print("=" * 50)
        
        # Test sequence
        tests = [
            ("Health Check", self.test_health_check),
            ("User Registration", self.test_register_user),
            ("User Login", self.test_login_user),
            ("Get User Config", self.test_get_user_config),
            ("Update User Config", self.test_update_user_config),
            ("File Upload (TXT)", self.test_file_upload_txt),
            ("Invalid Login", self.test_invalid_login),
            ("Unauthorized Access", self.test_unauthorized_access),
            ("Duplicate Registration", self.test_duplicate_registration),
        ]
        
        for test_name, test_func in tests:
            try:
                test_func()
            except Exception as e:
                print(f"❌ {test_name} failed with exception: {str(e)}")
                self.tests_run += 1
        
        # Print results
        print("\n" + "=" * 50)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return 1

def main():
    tester = AurisAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())