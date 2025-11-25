// background.js
// 只负责打开 clipboard.html 页面，所有剪贴板逻辑在页面中处理

chrome.action.onClicked.addListener(async () => {
    const pageUrl = chrome.runtime.getURL("clipboard.html");
    await chrome.tabs.create({ url: pageUrl, active: true });
});
