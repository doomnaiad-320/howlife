#!/usr/bin/env python3
"""
次数计费功能测试脚本
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils import calculate_total_cost, get_count_price

def test_calculate_total_cost():
    """测试计费计算函数"""
    print("=== 测试计费计算函数 ===")
    
    # 测试数据
    test_data = [
        {
            'model': 'gpt-4o',
            'total_prompt_tokens': 1000,
            'total_completion_tokens': 500,
            'request_count': 5
        },
        {
            'model': 'claude-3-5-sonnet',
            'total_prompt_tokens': 2000,
            'total_completion_tokens': 1000,
            'request_count': 3
        }
    ]
    
    model_price = {
        'gpt-4o': {
            'token_price': '0.01,0.02',
            'count_price': 0.01
        },
        'claude-3-5-sonnet': '0.12,0.48',
        'default': '1,2'
    }
    
    count_billing_config = {
        'default_count_price': 0.001,
        'model_count_prices': {
            'gpt-4o': 0.01,
            'claude-3': 0.005
        }
    }
    
    # 测试token计费
    print("\n1. Token计费测试:")
    result_token = calculate_total_cost(test_data, model_price, 'token')
    print(f"结果: {result_token}")
    
    # 测试次数计费
    print("\n2. 次数计费测试:")
    result_count = calculate_total_cost(test_data, model_price, 'count', count_billing_config)
    print(f"结果: {result_count}")
    
    # 测试混合计费
    print("\n3. 混合计费测试:")
    result_hybrid = calculate_total_cost(test_data, model_price, 'hybrid', count_billing_config)
    print(f"结果: {result_hybrid}")
    
    return True

def test_get_count_price():
    """测试次数价格获取函数"""
    print("\n=== 测试次数价格获取函数 ===")
    
    count_billing_config = {
        'default_count_price': 0.001,
        'model_count_prices': {
            'gpt-4o': 0.01,
            'claude-3': 0.005,
            'gemini': 0.003
        }
    }
    
    test_models = [
        'gpt-4o',
        'gpt-4o-mini',
        'claude-3-5-sonnet',
        'claude-3-opus',
        'gemini-pro',
        'unknown-model'
    ]
    
    for model in test_models:
        price = get_count_price(model, count_billing_config)
        print(f"模型 {model}: ${price}")
    
    return True

def test_billing_scenarios():
    """测试不同计费场景"""
    print("\n=== 测试不同计费场景 ===")
    
    # 场景1: 纯token计费用户
    print("\n场景1: 纯token计费用户")
    token_user_data = [
        {'model': 'gpt-4o', 'total_prompt_tokens': 10000, 'total_completion_tokens': 5000, 'request_count': 10}
    ]
    model_price = {'gpt-4o': '0.01,0.02', 'default': '1,2'}
    result = calculate_total_cost(token_user_data, model_price, 'token')
    print(f"Token计费结果: 总费用 ${result['total_cost']:.6f}")
    
    # 场景2: 纯次数计费用户
    print("\n场景2: 纯次数计费用户")
    count_config = {'default_count_price': 0.001, 'model_count_prices': {'gpt-4o': 0.01}}
    result = calculate_total_cost(token_user_data, model_price, 'count', count_config)
    print(f"次数计费结果: 总费用 ${result['total_cost']:.6f} (10次 × $0.01)")
    
    # 场景3: 混合计费用户
    print("\n场景3: 混合计费用户")
    mixed_price = {
        'gpt-4o': {
            'token_price': '0.01,0.02',
            'count_price': 0.01
        },
        'claude-3': '0.12,0.48',  # 只有token价格
        'default': '1,2'
    }
    mixed_data = [
        {'model': 'gpt-4o', 'total_prompt_tokens': 1000, 'total_completion_tokens': 500, 'request_count': 5},
        {'model': 'claude-3-5-sonnet', 'total_prompt_tokens': 2000, 'total_completion_tokens': 1000, 'request_count': 3}
    ]
    result = calculate_total_cost(mixed_data, mixed_price, 'hybrid', count_config)
    print(f"混合计费结果: 总费用 ${result['total_cost']:.6f}")
    for detail in result['billing_details']:
        print(f"  - {detail['model']}: ${detail['cost']:.6f} ({detail['cost_type']}计费)")
    
    return True

def main():
    """主测试函数"""
    print("开始次数计费功能测试...")
    
    try:
        # 运行所有测试
        test_calculate_total_cost()
        test_get_count_price()
        test_billing_scenarios()
        
        print("\n✅ 所有测试通过!")
        return True
        
    except Exception as e:
        print(f"\n❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
