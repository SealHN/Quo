// 配置常量
const CONFIG = {
    REPO_OWNER: 'SealHN',
    REPO_NAME: 'Quo',
    ADMIN_CODE: 'kuihua696969',
    SPECIAL_CODE: '4399',
    SPECIAL_URL: 'http://sealhn.github.io/Unweb',
    BANNED_WORDS: ['敏感词1', '敏感词2', '脏话', '攻击性词语'],
    PER_PAGE: 10
};

// 全局状态
const STATE = {
    currentPage: 1,
    isAdmin: false
};

// 初始化函数 - 页面加载完成后执行
function initialize() {
    console.log('初始化开始...');
    
    // 绑定事件监听器
    bindEventListeners();
    
    // 加载问题列表
    loadQuestions(STATE.currentPage);
    
    console.log('初始化完成');
}

// 绑定所有事件监听器
function bindEventListeners() {
    // 提交问题按钮
    document.getElementById('submitQuestion').addEventListener('click', handleQuestionSubmit);
    
    // 分页按钮
    document.getElementById('prevPage').addEventListener('click', () => changePage(-1));
    document.getElementById('nextPage').addEventListener('click', () => changePage(1));
    
    // 彩蛋按钮
    document.getElementById('secretBtn').addEventListener('click', showSecretModal);
    document.getElementById('submitSecret').addEventListener('click', handleSecretSubmit);
    
    // 模态框关闭按钮
    document.querySelectorAll('.modal .close').forEach(btn => {
        btn.addEventListener('click', closeAllModals);
    });
    
    console.log('事件监听器绑定完成');
}

// 加载问题列表
async function loadQuestions(page) {
    console.log(`正在加载第 ${page} 页问题...`);
    
    try {
        const questions = await fetchQuestions(page);
        renderQuestions(questions, page);
    } catch (error) {
        console.error('加载问题失败:', error);
        showError('加载问题失败，请刷新重试');
    }
}

// 从GitHub API获取问题
async function fetchQuestions(page) {
    const response = await fetch(
        `https://api.github.com/repos/${CONFIG.REPO_OWNER}/${CONFIG.REPO_NAME}/issues?` + 
        `state=open&per_page=${CONFIG.PER_PAGE}&page=${page}`
    );
    
    if (!response.ok) {
        throw new Error(`API请求失败: ${response.status}`);
    }
    
    const issues = await response.json();
    return issues.map(issue => ({
        id: issue.number,
        text: issue.title,
        date: new Date(issue.created_at).toLocaleDateString(),
        likes: getLikeCount(issue.labels),
        reply: getAdminReply(issue.body)
    }));
}

// 渲染问题列表
function renderQuestions(questions, page) {
    const questionsList = document.getElementById('questionsList');
    
    if (questions.length === 0) {
        questionsList.innerHTML = '<p class="no-questions">暂无提问，快来成为第一个提问的人吧~</p>';
        return;
    }
    
    questionsList.innerHTML = questions.map(question => `
        <div class="question-item" data-id="${question.id}">
            <div class="question-text">${question.text}</div>
            ${question.reply ? `<div class="reply-text">👑 回复: ${question.reply}</div>` : ''}
            <div class="question-meta">
                <span>${question.date}</span>
                <button class="like-btn" data-id="${question.id}">
                    ❤️ <span class="like-count">${question.likes}</span>
                </button>
            </div>
        </div>
    `).join('');
    
    // 更新分页信息
    document.getElementById('pageInfo').textContent = `第${page}页`;
    STATE.currentPage = page;
    
    // 绑定点赞按钮事件
    document.querySelectorAll('.like-btn').forEach(btn => {
        btn.addEventListener('click', handleLikeClick);
    });
}

// 处理问题提交
async function handleQuestionSubmit() {
    const input = document.getElementById('questionInput');
    const questionText = input.value.trim();
    
    if (!questionText) {
        showError('问题不能为空哦~');
        return;
    }
    
    if (containsBannedWords(questionText)) {
        showError('问题包含不适当内容，请修改后重新提交~');
        return;
    }
    
    try {
        await submitQuestion(questionText);
        input.value = '';
        showSuccess('问题提交成功！');
        loadQuestions(STATE.currentPage);
    } catch (error) {
        console.error('提交问题失败:', error);
        showError('提交失败，请稍后再试~');
    }
}

// 提交问题到GitHub
async function submitQuestion(questionText) {
    // 这里使用GitHub Actions处理提交
    const response = await fetch(`https://api.github.com/repos/${CONFIG.REPO_OWNER}/${CONFIG.REPO_NAME}/dispatches`, {
        method: 'POST',
        headers: {
            'Authorization': `token ${process.env.GH_TOKEN}`,
            'Accept': 'application/vnd.github.everest-preview+json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            event_type: 'new_question',
            client_payload: { question: questionText }
        })
    });
    
    if (!response.ok) {
        throw new Error(`提交失败: ${response.status}`);
    }
}

// 处理点赞点击
async function handleLikeClick(event) {
    const questionId = event.target.closest('.like-btn').dataset.id;
    
    try {
        await likeQuestion(questionId);
        loadQuestions(STATE.currentPage);
    } catch (error) {
        console.error('点赞失败:', error);
        showError('点赞失败，请稍后再试~');
    }
}

// 点赞问题
async function likeQuestion(questionId) {
    // 这里使用GitHub Actions处理点赞
    const response = await fetch(`https://api.github.com/repos/${CONFIG.REPO_OWNER}/${CONFIG.REPO_NAME}/dispatches`, {
        method: 'POST',
        headers: {
            'Authorization': `token ${process.env.GH_TOKEN}`,
            'Accept': 'application/vnd.github.everest-preview+json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            event_type: 'like_question',
            client_payload: { issue_number: questionId }
        })
    });
    
    if (!response.ok) {
        throw new Error(`点赞失败: ${response.status}`);
    }
}

// 处理彩蛋提交
function handleSecretSubmit() {
    const input = document.getElementById('secretInput').value.trim();
    
    if (input === CONFIG.ADMIN_CODE) {
        STATE.isAdmin = true;
        closeAllModals();
        showAdminPanel();
    } else if (input === CONFIG.SPECIAL_CODE) {
        window.open(CONFIG.SPECIAL_URL, '_blank');
        closeAllModals();
    } else {
        document.getElementById('secretMessage').textContent = '密码错误哦~';
    }
}

// 显示管理员面板
async function showAdminPanel() {
    const modal = document.getElementById('adminModal');
    const questions = await fetchAllQuestions();
    
    document.getElementById('adminQuestionsList').innerHTML = questions.map(q => `
        <div class="admin-question-item" data-id="${q.id}">
            <div class="admin-question-text">${q.text}</div>
            ${q.reply ? `
                <div class="reply-text">我的回复: ${q.reply}</div>
            ` : `
                <textarea class="admin-reply-input" placeholder="输入回复内容..."></textarea>
                <div class="admin-actions">
                    <button class="reply-btn">回复</button>
                    <button class="delete-btn">删除</button>
                </div>
            `}
        </div>
    `).join('');
    
    // 绑定管理员按钮事件
    document.querySelectorAll('.reply-btn').forEach(btn => {
        btn.addEventListener('click', handleAdminReply);
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', handleAdminDelete);
    });
    
    modal.style.display = 'block';
}

// 处理管理员回复
async function handleAdminReply(event) {
    const questionId = event.target.closest('.admin-question-item').dataset.id;
    const replyText = event.target.closest('.admin-question-item').querySelector('.admin-reply-input').value.trim();
    
    if (!replyText) {
        showError('回复内容不能为空');
        return;
    }
    
    try {
        await adminReply(questionId, replyText);
        showSuccess('回复成功！');
        showAdminPanel();
    } catch (error) {
        console.error('回复失败:', error);
        showError('回复失败，请稍后再试~');
    }
}

// 管理员回复问题
async function adminReply(questionId, replyText) {
    const response = await fetch(
        `https://api.github.com/repos/${CONFIG.REPO_OWNER}/${CONFIG.REPO_NAME}/issues/${questionId}/comments`,
        {
            method: 'POST',
            headers: {
                'Authorization': `token ${process.env.GH_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                body: `[ADMIN_REPLY] ${replyText}`
            })
        }
    );
    
    if (!response.ok) {
        throw new Error(`回复失败: ${response.status}`);
    }
}

// 处理管理员删除
async function handleAdminDelete(event) {
    if (!confirm('确定要删除这个问题吗？')) return;
    
    const questionId = event.target.closest('.admin-question-item').dataset.id;
    
    try {
        await deleteQuestion(questionId);
        showSuccess('删除成功！');
        showAdminPanel();
    } catch (error) {
        console.error('删除失败:', error);
        showError('删除失败，请稍后再试~');
    }
}

// 删除问题
async function deleteQuestion(questionId) {
    const response = await fetch(
        `https://api.github.com/repos/${CONFIG.REPO_OWNER}/${CONFIG.REPO_NAME}/issues/${questionId}`,
        {
            method: 'PATCH',
            headers: {
                'Authorization': `token ${process.env.GH_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                state: 'closed'
            })
        }
    );
    
    if (!response.ok) {
        throw new Error(`删除失败: ${response.status}`);
    }
}

// 辅助函数
function getLikeCount(labels) {
    const likeLabel = labels.find(label => label.name.startsWith('likes-'));
    return likeLabel ? parseInt(likeLabel.name.split('-')[1]) : 0;
}

function getAdminReply(body) {
    return body.includes('[ADMIN_REPLY]') ? body.split('[ADMIN_REPLY]')[1].trim() : null;
}

function containsBannedWords(text) {
    const lowerText = text.toLowerCase();
    return CONFIG.BANNED_WORDS.some(word => lowerText.includes(word.toLowerCase()));
}

function changePage(delta) {
    const newPage = STATE.currentPage + delta;
    if (newPage > 0) loadQuestions(newPage);
}

function showSecretModal() {
    document.getElementById('secretModal').style.display = 'block';
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
}

function showError(message) {
    alert(`错误: ${message}`);
}

function showSuccess(message) {
    alert(`成功: ${message}`);
}

// 启动应用
document.addEventListener('DOMContentLoaded', initialize);
