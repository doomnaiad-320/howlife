#!/usr/bin/env python3
"""
次数计费功能集成测试
需要运行的uni-api服务
"""

import requests
import json
import time
import sys

# 测试配置
BASE_URL = "http://localhost:8000"
ADMIN_KEY = "sk-Pkj60Yf8JFWxfgRmXQFWyGtWUddGZnmi3KlvowmRWpWpQxx"  # 从api.yaml获取
TEST_KEY = "sk-test-count-billing-key"

def test_api_connection():
    """测试API连接"""
    print("=== 测试API连接 ===")
    try:
        response = requests.get(f"{BASE_URL}/v1/models", 
                              headers={"Authorization": f"Bearer {ADMIN_KEY}"})
        if response.status_code == 200:
            print("✅ API连接正常")
            return True
        else:
            print(f"❌ API连接失败: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ API连接异常: {e}")
        return False

def test_api_keys_states():
    """测试API密钥状态查询"""
    print("\n=== 测试API密钥状态查询 ===")
    try:
        response = requests.get(f"{BASE_URL}/v1/api_keys_states",
                              headers={"Authorization": f"Bearer {ADMIN_KEY}"})
        if response.status_code == 200:
            data = response.json()
            print("✅ API密钥状态查询成功")
            print(f"发现 {len(data.get('api_keys_states', {}))} 个API密钥")
            
            # 显示每个密钥的计费信息
            for key, state in data.get('api_keys_states', {}).items():
                billing_mode = state.get('billing_mode', 'token')
                credits = state.get('credits', 0)
                count_credits = state.get('count_credits')
                enabled = state.get('enabled', False)
                
                print(f"  - {key[:20]}...")
                print(f"    计费模式: {billing_mode}")
                print(f"    余额: ${credits}")
                if count_credits is not None:
                    print(f"    次数余额: {count_credits}")
                print(f"    状态: {'启用' if enabled else '禁用'}")
            
            return True
        else:
            print(f"❌ API密钥状态查询失败: {response.status_code}")
            print(response.text)
            return False
    except Exception as e:
        print(f"❌ API密钥状态查询异常: {e}")
        return False

def test_add_count_credits():
    """测试添加次数余额"""
    print("\n=== 测试添加次数余额 ===")
    
    # 首先获取一个可用的API密钥
    try:
        response = requests.get(f"{BASE_URL}/v1/api_keys_states",
                              headers={"Authorization": f"Bearer {ADMIN_KEY}"})
        if response.status_code != 200:
            print("❌ 无法获取API密钥列表")
            return False
        
        data = response.json()
        api_keys = list(data.get('api_keys_states', {}).keys())
        if not api_keys:
            print("❌ 没有找到可用的API密钥")
            return False
        
        test_key = api_keys[0]  # 使用第一个密钥进行测试
        print(f"使用测试密钥: {test_key[:20]}...")
        
        # 添加次数余额
        response = requests.post(
            f"{BASE_URL}/v1/add_count_credits",
            params={"paid_key": test_key, "amount": 100},
            headers={"Authorization": f"Bearer {ADMIN_KEY}"}
        )
        
        if response.status_code == 200:
            result = response.json()
            print("✅ 次数余额添加成功")
            print(f"新的次数余额: {result.get('new_count_credits', 'N/A')}")
            return True
        else:
            print(f"❌ 次数余额添加失败: {response.status_code}")
            print(response.text)
            return False
            
    except Exception as e:
        print(f"❌ 次数余额添加异常: {e}")
        return False

def test_set_billing_mode():
    """测试设置计费模式"""
    print("\n=== 测试设置计费模式 ===")
    
    try:
        # 获取第一个API密钥
        response = requests.get(f"{BASE_URL}/v1/api_keys_states",
                              headers={"Authorization": f"Bearer {ADMIN_KEY}"})
        if response.status_code != 200:
            return False
        
        data = response.json()
        api_keys = list(data.get('api_keys_states', {}).keys())
        if not api_keys:
            return False
        
        test_key = api_keys[0]
        print(f"使用测试密钥: {test_key[:20]}...")
        
        # 设置为次数计费模式
        response = requests.post(
            f"{BASE_URL}/v1/set_billing_mode",
            params={"paid_key": test_key, "billing_mode": "count"},
            headers={"Authorization": f"Bearer {ADMIN_KEY}"}
        )
        
        if response.status_code == 200:
            result = response.json()
            print("✅ 计费模式设置成功")
            print(f"新的计费模式: count")
            return True
        else:
            print(f"❌ 计费模式设置失败: {response.status_code}")
            print(response.text)
            return False
            
    except Exception as e:
        print(f"❌ 计费模式设置异常: {e}")
        return False

def test_token_usage():
    """测试使用统计查询"""
    print("\n=== 测试使用统计查询 ===")
    
    try:
        # 获取第一个API密钥
        response = requests.get(f"{BASE_URL}/v1/api_keys_states",
                              headers={"Authorization": f"Bearer {ADMIN_KEY}"})
        if response.status_code != 200:
            return False
        
        data = response.json()
        api_keys = list(data.get('api_keys_states', {}).keys())
        if not api_keys:
            return False
        
        test_key = api_keys[0]
        print(f"查询测试密钥使用统计: {test_key[:20]}...")
        
        # 查询使用统计
        response = requests.get(
            f"{BASE_URL}/v1/token_usage",
            params={"api_key_param": test_key},
            headers={"Authorization": f"Bearer {ADMIN_KEY}"}
        )
        
        if response.status_code == 200:
            result = response.json()
            query_details = result.get('query_details', {})
            
            print("✅ 使用统计查询成功")
            print(f"计费模式: {query_details.get('billing_mode', 'N/A')}")
            print(f"余额: {query_details.get('credits', 'N/A')}")
            print(f"次数余额: {query_details.get('count_credits', 'N/A')}")
            print(f"总费用: {query_details.get('total_cost', 'N/A')}")
            print(f"总请求数: {query_details.get('total_requests', 'N/A')}")
            print(f"剩余余额: {query_details.get('balance', 'N/A')}")
            print(f"剩余次数: {query_details.get('count_balance', 'N/A')}")
            
            return True
        else:
            print(f"❌ 使用统计查询失败: {response.status_code}")
            print(response.text)
            return False
            
    except Exception as e:
        print(f"❌ 使用统计查询异常: {e}")
        return False

def main():
    """主测试函数"""
    print("开始次数计费功能集成测试...")
    print(f"测试目标: {BASE_URL}")
    
    tests = [
        test_api_connection,
        test_api_keys_states,
        test_add_count_credits,
        test_set_billing_mode,
        test_token_usage,
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        try:
            if test():
                passed += 1
            time.sleep(1)  # 避免请求过快
        except Exception as e:
            print(f"❌ 测试异常: {e}")
    
    print(f"\n=== 测试结果 ===")
    print(f"通过: {passed}/{total}")
    
    if passed == total:
        print("🎉 所有集成测试通过!")
        return True
    else:
        print("⚠️  部分测试失败，请检查配置和服务状态")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
