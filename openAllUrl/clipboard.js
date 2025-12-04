// 页面加载后自动读取剪贴板
window.addEventListener("load", async () => {
    try {
        const text = await navigator.clipboard.readText();
        handleClipboard(text);
    } catch (err) {
        document.getElementById("log").textContent = "读取剪贴板失败:\n" + err;
    }
});

// UI 元素
const urlContainer = document.getElementById("urlContainer");
const errContainer = document.getElementById("errContainer");
const errTitle = document.getElementById("errTitle");
const log = document.getElementById("log");
const openAllBtn = document.getElementById("openAllBtn");
const batchButtons = document.getElementById("batchButtons");
const batchTitle = document.getElementById("batchTitle");

let validUrls = [];
let errUrls = [];

// 处理剪贴板内容
function handleClipboard(text) {

    text = text.replace(/\r\n|\r/g, "\n");// 把各种换行统一为 \n，而不是删除
    text = text.replace(/([^\n])(https?:\/\/)/g, "$1\n$2"); //在 http 之前补换行（但避免一行里已经是换行的情况）
    
    text = text.replace(/^\n/, ""); // 去掉开头多余的换行
    
    const lines = text.split(/\r?\n/).map(t => t.trim()).filter(Boolean);

    urlContainer.innerHTML = "";
    validUrls = [];
    errUrls = [];

    lines.forEach(line => {
         if (isUrl(line)) {
             validUrls.push(line); 
            } 
            else {
                 errUrls.push(line); 
                } 
            });
            
    renderList();
    renderErrors();
    renderBatch();

    // 自动打开 （≤10）
    if (validUrls.length > 0 && validUrls.length <= 10) {
        openUrls(validUrls);
        window.close(); 
    }
}

// 显示有效 URL 列表
function renderList() {
    urlContainer.innerHTML = "";
    validUrls.forEach(url => {
        const a = document.createElement("a");
        a.href = url;
        a.textContent = url;
        a.target = "_blank";
        urlContainer.appendChild(a);
        urlContainer.appendChild(document.createElement("br"));
    });
}

// 显示错误 URL
function renderErrors() {
    if (errUrls.length === 0) return;

    errTitle.textContent = "不是有效 URL：";
    errContainer.innerHTML = "";

    errUrls.forEach(e => {
        const div = document.createElement("div");
        div.textContent = e;
        errContainer.appendChild(div);
    });
}

// 分批显示按钮（每批 20 条）
function renderBatch() {
    batchButtons.innerHTML = "";

    if (validUrls.length <= 20) {
        batchTitle.textContent = "";
        return;
    }

    const total = validUrls.length;
    batchTitle.textContent = `共 ${total} 条 URL，分批打开：`;

    const batchSize = 20;
    const batchCount = Math.ceil(total / batchSize);

    for (let i = 0; i < batchCount; i++) {
        const start = i * batchSize;
        const end = Math.min(start + batchSize, total);

        const btn = document.createElement("button");
        btn.textContent = `打开第 ${i + 1} 批（${end - start} 条）`;
        btn.style.margin = "4px";

        btn.onclick = () => {
            openUrls(validUrls.slice(start, end));
        };

        batchButtons.appendChild(btn);
    }
}

// 打开多个 URL
function openUrls(list) {
    list.forEach(url => {
        chrome.tabs.create({ url, active: false });
    });
}

// 工具函数：判断是否是完整 URL
function isUrl(str) {
    try {
        new URL(str);
        return true;
    } catch {
        return false;
    }
}

// 点击 "批量打开（全部）"
openAllBtn.onclick = () => {
    if (validUrls.length > 0) {
        openUrls(validUrls);
    }
};
