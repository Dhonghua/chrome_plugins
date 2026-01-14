import requests
import time
import hashlib
from urllib.parse import urlparse
import json

def extract_domain(url: str) -> str:
    return urlparse(url).netloc

class Md5Token:
    @staticmethod
    def sitme():
        # 等价于 JS: new Date().getTime().toString().slice(0, 10)
        return str(int(time.time()))

    @staticmethod
    def token(nowtime: str):
        raw = nowtime + 'NAgwtY8Go36r2yJPQ'
        return hashlib.md5(raw.encode('utf-8')).hexdigest()

now_stime = Md5Token.sitme()
token = Md5Token.token(now_stime)

url = "https://apis.imyfone.com/api/tool/site_list"

headers = {
    "stime": now_stime,
    "token": token,
    "User-Agent": "Mozilla/5.0"
}

res = requests.get(url, headers=headers, timeout=10)
json_data = res.json()
production_list = json_data['data']['production_list']
pre_release_list = json_data['data']['pre_release_list']

domain_map = {}

for prod, pre in zip(production_list, pre_release_list):
    prod_domain = extract_domain(prod)
    pre_domain = extract_domain(pre)

    domain_map[prod_domain] = pre_domain
    domain_map[pre_domain] = prod_domain

print(len(production_list)) 
print(len(domain_map))

with open("domainMap.js", "w", encoding="utf-8") as f:
    f.write("// domainMap.js\n// =========================================================\n// 域名映射表（环境互转）\n// 🌐 环境映射表\n// =========================================================\n// 作用：实现测试环境和正式环境的域名互相跳转映射\n// 你可以在这里添加任意域名映射对\n\nexport const import requests
import time
import hashlib
from urllib.parse import urlparse
import json

def extract_domain(url: str) -> str:
    return urlparse(url).netloc

class Md5Token:
    @staticmethod
    def sitme():
        # 等价于 JS: new Date().getTime().toString().slice(0, 10)
        return str(int(time.time()))

    @staticmethod
    def token(nowtime: str):
        raw = nowtime + 'NAgwtY8Go36r2yJPQ'
        return hashlib.md5(raw.encode('utf-8')).hexdigest()

now_stime = Md5Token.sitme()
token = Md5Token.token(now_stime)

url = "https://apis.imyfone.com/api/tool/site_list"

headers = {
    "stime": now_stime,
    "token": token,
    "User-Agent": "Mozilla/5.0"
}

res = requests.get(url, headers=headers, timeout=10)
json_data = res.json()
production_list = json_data['data']['production_list']
pre_release_list = json_data['data']['pre_release_list']

domain_map = {}

for prod, pre in zip(production_list, pre_release_list):
    prod_domain = extract_domain(prod)
    pre_domain = extract_domain(pre)

    domain_map[prod_domain] = pre_domain
    domain_map[pre_domain] = prod_domain

print(len(production_list)) 
print(len(domain_map))

with open("domainMap.js", "w", encoding="utf-8") as f:
    f.write("// domainMap.js\n// =========================================================\n// 域名映射表（环境互转）\n// 🌐 环境映射表\n// =========================================================\n// 作用：实现测试环境和正式环境的域名互相跳转映射\n// 你可以在这里添加任意域名映射对\n\nexport const domainMap = ")
    f.write(json.dumps(domain_map, indent=2, ensure_ascii=False))
    # f.write(";\n\nexport default domainMap;\n")

## 检查重复域名
# from collections import Counter
# counter = Counter()
# for prod, pre in zip(production_list, pre_release_list):
#     counter[extract_domain(prod)] += 1
#     counter[extract_domain(pre)] += 1

# duplicates = {k: v for k, v in counter.items() if v > 1}
# print(production_list)
# print(duplicates) = ")
    # f.write(json.dumps(domain_map, indent=2, ensure_ascii=False))
    # f.write(";\n\nexport default domainMap;\n")

## 检查重复域名
# from collections import Counter
# counter = Counter()
# for prod, pre in zip(production_list, pre_release_list):
#     counter[extract_domain(prod)] += 1
#     counter[extract_domain(pre)] += 1

# duplicates = {k: v for k, v in counter.items() if v > 1}
# print(production_list)
# print(duplicates)