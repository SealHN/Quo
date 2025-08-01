// 全局错误捕获
window.onerror = function(msg, url, line) {
  alert(`错误: ${msg}\n行号: ${line}`);
};

// 检查所有按钮
const checkButtons = () => {
  const btn = document.getElementById('submitQuestion');
  console.log("按钮状态：", btn);
  btn.onclick = () => alert('测试事件已绑定');
};

// 每3秒检查一次
setInterval(checkButtons, 3000);
// 配置
const REPO_OWNER = 'SealHN';
const REPO_NAME = 'Quo';
const ADMIN_CODE = 'kuihua696969';
const SPECIAL_CODE = '4399';
const SPECIAL_URL = 'http://sealhn.github.io/Unweb';

// 敏感词列表
const BANNED_WORDS = ['钢筋', '水泥', '筷子']; // 根据需要添加

// 加密函数 - 使用简单的哈希算法
function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
}

// 检查敏感词
function containsBannedWords(text) {
    const lowerText = text.toLowerCase();
    return BANNED_WORDS.some(word => lowerText.includes(word.toLowerCase()));
}

// 获取问题列表
async function fetchQuestions(page = 1) {
    try {
        const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/issues?state=open&per_page=10&page=${page}`);
        if (!response.ok) throw new Error('获取问题失败');
        const issues = await response.json();
        
        const questions = issues.map(issue => ({
            id: issue.number,
            text: issue.title,
            date: new Date(issue.created_at).toLocaleDateString(),
            likes: issue.labels.some(label => label.name.startsWith('likes-')) ? 
                   parseInt(issue.labels.find(label => label.name.startsWith('likes-')).name.split('-')[1]) : 0,
            reply: issue.body.includes('[ADMIN_REPLY]') ? 
                   issue.body.split('[ADMIN_REPLY]')[1].trim() : null
        }));
        
        return questions;
    } catch (error) {
        console.error('Error fetching questions:', error);
        return [];
    }
}

// 提交新问题
async function submitQuestion() {
    const questionInput = document.getElementById('questionInput');
    const questionText = questionInput.value.trim();
    
    if (!questionText) {
        alert('问题不能为空哦~');
        return;
    }
    
    if (containsBannedWords(questionText)) {
        alert('问题包含不适当内容，请修改后重新提交~');
        return;
    }
    
    try {
        // 通过 GitHub Actions 处理提交
        await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/dispatches`, {
            method: 'POST',
            headers: {
                'Authorization': `token ${process.env.GH_TOKEN}`,
                'Accept': 'application/vnd.github.everest-preview+json'
            },
            body: JSON.stringify({
                event_type: 'new_question',
                client_payload: {
                    question: questionText
                }
            })
        });
        
        alert('问题已提交，刷新后可见~');
        questionInput.value = '';
    } catch (error) {
        console.error('Error submitting question:', error);
        alert('提交失败，请稍后再试~');
    }
}

// 管理员功能
let isAdmin = false;

// 检查密码输入
function checkSecretCode() {
    const input = document.getElementById('secretInput').value.trim();
    
    if (input === ADMIN_CODE) {
        isAdmin = true;
        document.getElementById('secretModal').style.display = 'none';
        document.getElementById('adminModal').style.display = 'block';
        loadAdminQuestions();
    } else if (input === SPECIAL_CODE) {
        window.open(SPECIAL_URL, '_blank');
        document.getElementById('secretModal').style.display = 'none';
    } else {
        document.getElementById('secretMessage').textContent = '密码错误哦~';
    }
}

// 加载管理员问题列表
async function loadAdminQuestions() {
    const questions = await fetchAllQuestions();
    const adminList = document.getElementById('adminQuestionsList');
    
    adminList.innerHTML = questions.map(question => `
        <div class="admin-question-item" data-id="${question.id}">
            <div class="admin-question-text">${question.text}</div>
            ${question.reply ? `
                <div class="reply-text">我的回复: ${question.reply}</div>
            ` : `
                <textarea class="admin-reply-input" placeholder="输入回复内容..."></textarea>
                <div class="admin-actions">
                    <button class="reply-btn">回复</button>
                    <button class="delete-btn">删除</button>
                </div>
            `}
        </div>
    `).join('');
    
    // 添加事件监听
    document.querySelectorAll('.reply-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const questionId = btn.closest('.admin-question-item').dataset.id;
            const replyText = btn.closest('.admin-question-item').querySelector('.admin-reply-input').value;
            await adminReply(questionId, replyText);
            loadAdminQuestions();
        });
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const questionId = btn.closest('.admin-question-item').dataset.id;
            await deleteQuestion(questionId);
            loadAdminQuestions();
        });
    });
}

// 管理员回复
async function adminReply(questionId, replyText) {
    try {
        await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/issues/${questionId}/comments`, {
            method: 'POST',
            headers: {
                'Authorization': `token ${process.env.GH_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify({
                body: `[ADMIN_REPLY] ${replyText}`
            })
        });
    } catch (error) {
        console.error('Error replying to question:', error);
    }
}

// 删除问题
async function deleteQuestion(questionId) {
    try {
        await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/issues/${questionId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `token ${process.env.GH_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify({
                state: 'closed'
            })
        });
    } catch (error) {
        console.error('Error deleting question:', error);
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    // 初始化页面
    renderQuestions();
    
    // 事件监听
    document.getElementById('submitQuestion').addEventListener('click', submitQuestion);
    document.getElementById('secretBtn').addEventListener('click', () => {
        document.getElementById('secretModal').style.display = 'block';
    });
    document.getElementById('submitSecret').addEventListener('click', checkSecretCode);
    document.querySelectorAll('.close').forEach(btn => {
        btn.addEventListener('click', () => {
            document.getElementById('secretModal').style.display = 'none';
            document.getElementById('adminModal').style.display = 'none';
        });
    });
    
    // 分页
    document.getElementById('prevPage').addEventListener('click', () => {
        if (currentPage > 1) renderQuestions(currentPage - 1);
    });
    document.getElementById('nextPage').addEventListener('click', () => {
        renderQuestions(currentPage + 1);
    });
});

let currentPage = 1;
