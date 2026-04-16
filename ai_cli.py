#!/usr/bin/env python3
import json
import os
import requests
import argparse
import readline
from datetime import datetime
from typing import List, Dict, Optional
import re

try:
    from rich.console import Console
    from rich.markdown import Markdown
    from rich.panel import Panel
    from rich.syntax import Syntax
    from rich.progress import Progress, SpinnerColumn, TextColumn
    RICH_AVAILABLE = True
except ImportError:
    RICH_AVAILABLE = False

CONFIG_FILE = os.path.expanduser('~/.ai_cli_config.json')
HISTORY_FILE = os.path.expanduser('~/.ai_cli_history')
SKILLS_DIR = os.path.join(os.path.dirname(__file__), 'skills', 'skills')
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
    "model_tokens": {},
    "skills": {
        "enabled": True,
        "directory": SKILLS_DIR
    }
}

class Color:
    if RICH_AVAILABLE:
        USER = "[bold cyan]"
        ASSISTANT = "[bold green]"
        SYSTEM = "[bold yellow]"
        ERROR = "[bold red]"
        RESET = "[/]"
    else:
        USER = "\033[36m"
        ASSISTANT = "\033[32m"
        SYSTEM = "\033[33m"
        ERROR = "\033[31m"
        RESET = "\033[0m"

class ModelManager:
    def __init__(self, config, console=None):
        self.config = config
        self.console = console
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
        models_url = f"{self.api_base}/models"
        response = requests.get(models_url, headers=self.headers)
        if response.status_code == 200:
            models_data = response.json()
            return [model.get('id') for model in models_data.get("data", [])]
        else:
            self._print_error(f"获取模型列表失败: {response.status_code}")
            return []
    
    def switch_model(self):
        if not self.model_priority:
            self._print_error("没有配置模型优先级列表")
            return None
        
        current_index = self.model_priority.index(self.current_model) if self.current_model in self.model_priority else -1
        next_index = (current_index + 1) % len(self.model_priority)
        next_model = self.model_priority[next_index]
        
        self._print_system(f"切换到模型: {next_model}")
        self.current_model = next_model
        self.config["current_model"] = next_model
        self.save_config()
        return next_model
    
    def save_config(self):
        with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
            json.dump(self.config, f, indent=2, ensure_ascii=False)
    
    def update_token_usage(self, model, tokens):
        if model not in self.model_tokens:
            self.model_tokens[model] = {}
        today = datetime.now().strftime("%Y-%m-%d")
        if today not in self.model_tokens[model]:
            self.model_tokens[model][today] = 0
        self.model_tokens[model][today] += tokens
        self.config["model_tokens"] = self.model_tokens
        self.save_config()
    
    def _print_error(self, message):
        if self.console and RICH_AVAILABLE:
            self.console.print(f"[bold red]{message}[/]")
        else:
            print(f"{Color.ERROR}{message}{Color.RESET}")
    
    def _print_system(self, message):
        if self.console and RICH_AVAILABLE:
            self.console.print(f"[bold yellow]{message}[/]")
        else:
            print(f"{Color.SYSTEM}{message}{Color.RESET}")

class SkillManager:
    def __init__(self, config, console=None):
        self.config = config
        self.console = console
        self.skills_dir = config.get("skills", {}).get("directory", SKILLS_DIR)
        self.skills = self._load_skills()
    
    def _load_skills(self):
        skills = {}
        if not os.path.exists(self.skills_dir):
            return skills
        
        for skill_name in os.listdir(self.skills_dir):
            skill_path = os.path.join(self.skills_dir, skill_name)
            if os.path.isdir(skill_path):
                skill_file = os.path.join(skill_path, "SKILL.md")
                if os.path.exists(skill_file):
                    try:
                        with open(skill_file, 'r', encoding='utf-8') as f:
                            content = f.read()
                            # 提取技能名称和描述
                            name_match = re.search(r'name: (.*)', content)
                            description_match = re.search(r'description: (.*)', content)
                            if name_match and description_match:
                                skills[skill_name] = {
                                    "name": name_match.group(1),
                                    "description": description_match.group(1),
                                    "path": skill_path
                                }
                    except Exception as e:
                        if self.console and RICH_AVAILABLE:
                            self.console.print(f"[bold red]加载技能 {skill_name} 失败: {e}[/]")
                        else:
                            print(f"{Color.ERROR}加载技能 {skill_name} 失败: {e}{Color.RESET}")
        return skills
    
    def list_skills(self):
        return list(self.skills.keys())
    
    def get_skill(self, skill_name):
        return self.skills.get(skill_name)
    
    def reload_skills(self):
        self.skills = self._load_skills()
        return len(self.skills)
    
    def _print_error(self, message):
        if self.console and RICH_AVAILABLE:
            self.console.print(f"[bold red]{message}[/]")
        else:
            print(f"{Color.ERROR}{message}{Color.RESET}")
    
    def _print_system(self, message):
        if self.console and RICH_AVAILABLE:
            self.console.print(f"[bold yellow]{message}[/]")
        else:
            print(f"{Color.SYSTEM}{message}{Color.RESET}")

class AICLI:
    def __init__(self):
        self.config = self.load_config()
        self.console = Console() if RICH_AVAILABLE else None
        self.model_manager = ModelManager(self.config, self.console)
        self.skill_manager = SkillManager(self.config, self.console)
        self.messages: List[Dict] = []
        self._load_history()
    
    def load_config(self):
        if os.path.exists(CONFIG_FILE):
            with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        else:
            with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
                json.dump(DEFAULT_CONFIG, f, indent=2, ensure_ascii=False)
            return DEFAULT_CONFIG
    
    def _load_history(self):
        if os.path.exists(HISTORY_FILE):
            readline.read_history_file(HISTORY_FILE)
    
    def _save_history(self):
        readline.write_history_file(HISTORY_FILE)
    
    def chat_completion(self, messages, model=None):
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
                usage = result.get('usage', {})
                total_tokens = usage.get('total_tokens', 0)
                self.model_manager.update_token_usage(model, total_tokens)
                return result['choices'][0]['message']['content']
            else:
                self._print_error(f"模型 {model} 请求失败: {response.status_code}")
                next_model = self.model_manager.switch_model()
                if next_model:
                    return self.chat_completion(messages, next_model)
                else:
                    return f"所有模型请求失败: {response.text}"
        except Exception as e:
            self._print_error(f"请求异常: {e}")
            next_model = self.model_manager.switch_model()
            if next_model:
                return self.chat_completion(messages, next_model)
            else:
                return f"请求异常: {str(e)}"
    
    def _print_welcome(self):
        if self.console and RICH_AVAILABLE:
            self.console.print(Panel(
                "[bold green]AI CLI 助手[/]\n\n"
                f"当前模型: [cyan]{self.model_manager.current_model}[/]\n"
                "输入 /help 查看可用命令",
                title="🤖 欢迎使用 AI CLI",
                border_style="blue"
            ))
        else:
            print(f"{Color.SYSTEM}=== AI CLI 助手 ==={Color.RESET}")
            print(f"当前模型: {self.model_manager.current_model}")
            print("输入 /help 查看可用命令")
            print()
    
    def _print_help(self):
        commands = [
            ("/help", "显示帮助信息"),
            ("/clear", "清除对话历史"),
            ("/switch", "切换到下一个模型"),
            ("/model", "显示当前使用的模型"),
            ("/tokens", "显示今日token使用情况"),
            ("/skills", "显示可用的技能"),
            ("/skill <name>", "显示指定技能的详细信息"),
            ("/reload-skills", "重新加载技能"),
            ("/exit", "退出程序"),
            ("/quit", "退出程序")
        ]
        
        if self.console and RICH_AVAILABLE:
            self.console.print(Panel(
                "\n".join([f"[cyan]{cmd}[/]: {desc}" for cmd, desc in commands]),
                title="可用命令",
                border_style="green"
            ))
        else:
            print(f"\n{Color.SYSTEM}可用命令:{Color.RESET}")
            for cmd, desc in commands:
                print(f"  {Color.USER}{cmd}{Color.RESET}: {desc}")
            print()
    
    def _print_skills(self):
        skills = self.skill_manager.list_skills()
        if not skills:
            self._print_system("没有找到可用的技能")
            return
        
        if self.console and RICH_AVAILABLE:
            lines = []
            for skill in skills:
                skill_info = self.skill_manager.get_skill(skill)
                if skill_info:
                    lines.append(f"[cyan]{skill}[/]: {skill_info['description']}")
            self.console.print(Panel("\n".join(lines), title="可用技能", border_style="blue"))
        else:
            print(f"\n{Color.SYSTEM}可用技能:{Color.RESET}")
            for skill in skills:
                skill_info = self.skill_manager.get_skill(skill)
                if skill_info:
                    print(f"  {Color.USER}{skill}{Color.RESET}: {skill_info['description']}")
            print()
    
    def _print_skill_details(self, skill_name):
        skill_info = self.skill_manager.get_skill(skill_name)
        if not skill_info:
            self._print_error(f"未找到技能: {skill_name}")
            return
        
        if self.console and RICH_AVAILABLE:
            self.console.print(Panel(
                f"[bold]名称:[/] {skill_info['name']}\n"\
                f"[bold]描述:[/] {skill_info['description']}\n"\
                f"[bold]路径:[/] {skill_info['path']}",
                title=f"技能详情: {skill_name}",
                border_style="purple"
            ))
        else:
            print(f"\n{Color.SYSTEM}技能详情: {skill_name}{Color.RESET}")
            print(f"  名称: {skill_info['name']}")
            print(f"  描述: {skill_info['description']}")
            print(f"  路径: {skill_info['path']}")
            print()
    
    def _print_tokens(self):
        today = datetime.now().strftime("%Y-%m-%d")
        total_tokens = 0
        
        if self.console and RICH_AVAILABLE:
            lines = []
            for model, usage in self.model_manager.model_tokens.items():
                if today in usage:
                    lines.append(f"[cyan]{model}[/]: {usage[today]} tokens")
                    total_tokens += usage[today]
            lines.append(f"\n[bold]总计: {total_tokens} tokens[/]")
            self.console.print(Panel("\n".join(lines), title=f"今日Token使用 ({today})", border_style="yellow"))
        else:
            print(f"\n{Color.SYSTEM}今日Token使用 ({today}):{Color.RESET}")
            for model, usage in self.model_manager.model_tokens.items():
                if today in usage:
                    print(f"  {model}: {usage[today]} tokens")
                    total_tokens += usage[today]
            print(f"  总计: {total_tokens} tokens\n")
    
    def _print_error(self, message):
        if self.console and RICH_AVAILABLE:
            self.console.print(f"[bold red]{message}[/]")
        else:
            print(f"{Color.ERROR}{message}{Color.RESET}")
    
    def _print_user(self, message):
        if self.console and RICH_AVAILABLE:
            self.console.print(f"\n[bold cyan]👤 你:[/]\n{message}")
        else:
            print(f"\n{Color.USER}👤 你:{Color.RESET}")
            print(message)
    
    def _print_assistant(self, message):
        if self.console and RICH_AVAILABLE:
            self.console.print(f"\n[bold green]🤖 助手:[/]")
            self.console.print(Markdown(message))
        else:
            print(f"\n{Color.ASSISTANT}🤖 助手:{Color.RESET}")
            print(message)
    
    def run_interactive(self):
        self._print_welcome()
        
        try:
            while True:
                try:
                    user_input = input(f"{Color.USER}>>> {Color.RESET}").strip()
                except EOFError:
                    print("\n再见！")
                    break
                except KeyboardInterrupt:
                    print("\n按 /exit 或 /quit 退出")
                    continue
                
                if not user_input:
                    continue
                
                if user_input.startswith('/'):
                    cmd = user_input.lower()
                    if cmd in ['/exit', '/quit']:
                        print("再见！")
                        break
                    elif cmd == '/help':
                        self._print_help()
                    elif cmd == '/clear':
                        self.messages = []
                        self._print_system("对话历史已清除")
                    elif cmd == '/switch':
                        self.model_manager.switch_model()
                    elif cmd == '/model':
                        self._print_system(f"当前使用的模型: {self.model_manager.current_model}")
                    elif cmd == '/tokens':
                        self._print_tokens()
                    elif cmd == '/skills':
                        self._print_skills()
                    elif cmd.startswith('/skill '):
                        skill_name = user_input[7:].strip()
                        self._print_skill_details(skill_name)
                    elif cmd == '/reload-skills':
                        count = self.skill_manager.reload_skills()
                        self._print_system(f"已重新加载 {count} 个技能")
                    else:
                        self._print_error(f"未知命令: {user_input}。输入 /help 查看可用命令")
                    continue
                
                self.messages.append({"role": "user", "content": user_input})
                self._print_user(user_input)
                
                if self.console and RICH_AVAILABLE:
                    with Progress(
                        SpinnerColumn(),
                        TextColumn("[progress.description]{task.description}"),
                        console=self.console,
                        transient=True
                    ) as progress:
                        progress.add_task("正在思考...", total=None)
                        response = self.chat_completion(self.messages)
                else:
                    print("正在思考...")
                    response = self.chat_completion(self.messages)
                
                self._print_assistant(response)
                self.messages.append({"role": "assistant", "content": response})
                
        finally:
            self._save_history()
    
    def run_single(self, prompt):
        self.messages.append({"role": "user", "content": prompt})
        response = self.chat_completion(self.messages)
        if self.console and RICH_AVAILABLE:
            self.console.print(Markdown(response))
        else:
            print(response)
    
    def run(self, args):
        if args.prompt:
            self.run_single(args.prompt)
        else:
            self.run_interactive()
    
    def _print_system(self, message):
        if self.console and RICH_AVAILABLE:
            self.console.print(f"[bold yellow]{message}[/]")
        else:
            print(f"{Color.SYSTEM}{message}{Color.RESET}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="AI CLI 工具，支持自动切换模型和交互模式")
    parser.add_argument("--prompt", type=str, help="单次提示词（不进入交互模式）")
    
    args = parser.parse_args()
    
    cli = AICLI()
    cli.run(args)
