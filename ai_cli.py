#!/usr/bin/env python3
import json
import os
import requests
import argparse
import readline
from datetime import datetime

# 配置管理
CONFIG_FILE = os.path.expanduser('~/.ai_cli_config.json')
DEFAULT_CONFIG = {
    "api_base": "https://dashscope.aliyuncs.com/compatible-mode/v1",
    "api_key": "sk-9f6248b7fe5a424b80b360334b190ad2",
    "model_priority": [
        "qwen3.6-plus",
        "qwen3.5-omni-plus",
        "qwen3.5-flash",
        "qwen3-max",
        "glm-5.1",
        "kimi-k2.5"
    ],
    "current_model": "qwen3.6-plus",
    "model_tokens": {}
}

class ModelManager:
    def __init__(self, config):
        self.config = config
        self.api_base = config.get("api_base")
        self.api_key = config.get("api_key")
        self.model_priority = config.get("model_priority", [])
        self.current_model = config.get("current_model")
        self.model_tokens = config.get("model_tokens", {})
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
    
    def get_models(self):
        """获取所有可用模型"""
        models_url = f"{self.api_base}/models"
        response = requests.get(models_url, headers=self.headers)
        if response.status_code == 200:
            models_data = response.json()
            return [model.get('id') for model in models_data.get("data", [])]
        else:
            print(f"获取模型列表失败: {response.status_code}")
            return []
    
    def switch_model(self):
        """切换到下一个可用模型"""
        if not self.model_priority:
            print("没有配置模型优先级列表")
            return None
        
        current_index = self.model_priority.index(self.current_model) if self.current_model in self.model_priority else -1
        next_index = (current_index + 1) % len(self.model_priority)
        next_model = self.model_priority[next_index]
        
        print(f"切换到模型: {next_model}")
        self.current_model = next_model
        self.config["current_model"] = next_model
        self.save_config()
        return next_model
    
    def save_config(self):
        """保存配置到文件"""
        with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
            json.dump(self.config, f, indent=2, ensure_ascii=False)
    
    def update_token_usage(self, model, tokens):
        """更新模型的token使用情况"""
        if model not in self.model_tokens:
            self.model_tokens[model] = {}
        today = datetime.now().strftime("%Y-%m-%d")
        if today not in self.model_tokens[model]:
            self.model_tokens[model][today] = 0
        self.model_tokens[model][today] += tokens
        self.config["model_tokens"] = self.model_tokens
        self.save_config()

class AICLI:
    def __init__(self):
        self.config = self.load_config()
        self.model_manager = ModelManager(self.config)
    
    def load_config(self):
        """加载配置文件"""
        if os.path.exists(CONFIG_FILE):
            with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        else:
            # 保存默认配置
            with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
                json.dump(DEFAULT_CONFIG, f, indent=2, ensure_ascii=False)
            return DEFAULT_CONFIG
    
    def chat_completion(self, messages, model=None):
        """调用聊天完成API"""
        if model is None:
            model = self.model_manager.current_model
        
        chat_url = f"{self.config['api_base']}/chat/completions"
        payload = {
            "model": model,
            "messages": messages,
            "temperature": 0.7
        }
        
        try:
            response = requests.post(chat_url, headers=self.model_manager.headers, json=payload)
            if response.status_code == 200:
                result = response.json()
                # 更新token使用情况
                usage = result.get('usage', {})
                total_tokens = usage.get('total_tokens', 0)
                self.model_manager.update_token_usage(model, total_tokens)
                return result['choices'][0]['message']['content']
            else:
                # 如果当前模型失败，尝试切换模型
                print(f"模型 {model} 请求失败: {response.status_code}")
                next_model = self.model_manager.switch_model()
                if next_model:
                    return self.chat_completion(messages, next_model)
                else:
                    return f"所有模型请求失败: {response.text}"
        except Exception as e:
            print(f"请求异常: {e}")
            # 尝试切换模型
            next_model = self.model_manager.switch_model()
            if next_model:
                return self.chat_completion(messages, next_model)
            else:
                return f"请求异常: {str(e)}"
    
    def run(self, args):
        """运行CLI"""
        if args.prompt:
            messages = [{"role": "user", "content": args.prompt}]
            response = self.chat_completion(messages)
            print(response)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="AI CLI 工具，支持自动切换模型")
    parser.add_argument("--prompt", type=str, help="单次提示词")
    
    args = parser.parse_args()
    
    cli = AICLI()
    cli.run(args)
