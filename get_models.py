import requests

API_BASE = "https://dashscope.aliyuncs.com/compatible-mode/v1"
API_KEY = "sk-9f6248b7fe5a424b80b360334b190ad2"

# 构建获取模型列表的URL
models_url = f"{API_BASE}/models"

# 设置请求头
headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

# 发送GET请求获取模型列表
response = requests.get(models_url, headers=headers)

# 检查响应状态
if response.status_code == 200:
    # 解析响应内容
    models_data = response.json()
    print("支持的模型列表:")
    for model in models_data.get("data", []):
        print(f"- {model.get('id')}")
else:
    print(f"请求失败，状态码: {response.status_code}")
    print(f"响应内容: {response.text}")
