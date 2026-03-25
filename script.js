// Global variables
let knowledgeData = null;
let currentSearchTerm = '';

// Load data when page loads
document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    setupEventListeners();
});

// Load JSON data
async function loadData() {
    try {
        const response = await fetch('data.json');
        knowledgeData = await response.json();
        console.log('✅ Data loaded successfully');
    } catch (error) {
        console.error('❌ Error loading data:', error);
        showErrorMessage();
    }
}

// Setup event listeners
function setupEventListeners() {
    const searchInput = document.getElementById('searchInput');
    const clearBtn = document.getElementById('clearSearch');
    
    searchInput.addEventListener('input', (e) => {
        currentSearchTerm = e.target.value.trim();
        clearBtn.style.display = currentSearchTerm ? 'flex' : 'none';
        
        if (currentSearchTerm.length >= 1) {
            performSearch(currentSearchTerm);
        } else if (currentSearchTerm.length === 0) {
            showWelcomeMessage();
        }
    });
    
    clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        currentSearchTerm = '';
        clearBtn.style.display = 'none';
        showWelcomeMessage();
        searchInput.focus();
    });
    
    // Suggestion buttons
    document.querySelectorAll('.suggestion-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            searchInput.value = btn.textContent;
            currentSearchTerm = btn.textContent;
            clearBtn.style.display = 'flex';
            performSearch(currentSearchTerm);
        });
    });
}

// Perform search across all content
function performSearch(term) {
    if (!knowledgeData) return;
    
    const results = [];
    const searchTermLower = term.toLowerCase();
    
    // Search through each chapter
    for (const [chapterId, chapter] of Object.entries(knowledgeData.chapters)) {
        const chapterMatches = {
            id: chapterId,
            title: chapter.title,
            summary: chapter.summary,
            details: [],
            examples: [],
            questions: [],
            matchScore: 0
        };
        
        // Check title
        if (chapter.title.toLowerCase().includes(searchTermLower)) {
            chapterMatches.matchScore += 10;
        }
        
        // Check summary
        if (chapter.summary.toLowerCase().includes(searchTermLower)) {
            chapterMatches.matchScore += 5;
            chapterMatches.summaryMatch = true;
        }
        
        // Check details
        if (chapter.details) {
            chapter.details.forEach(detail => {
                if (detail.toLowerCase().includes(searchTermLower)) {
                    chapterMatches.details.push(detail);
                    chapterMatches.matchScore += 3;
                }
            });
        }
        
        // Check examples
        if (chapter.examples) {
            chapter.examples.forEach(example => {
                if (example.toLowerCase().includes(searchTermLower)) {
                    chapterMatches.examples.push(example);
                    chapterMatches.matchScore += 4;
                }
            });
        }
        
        // Check questions
        if (chapter.questions) {
            chapter.questions.forEach((q, idx) => {
                if (q.question.toLowerCase().includes(searchTermLower) || 
                    q.answer.toLowerCase().includes(searchTermLower)) {
                    chapterMatches.questions.push({
                        ...q,
                        originalIndex: idx
                    });
                    chapterMatches.matchScore += 4;
                }
            });
        }
        
        // Add if matches found
        if (chapterMatches.matchScore > 0) {
            results.push(chapterMatches);
        }
    }
    
    // Sort by match score
    results.sort((a, b) => b.matchScore - a.matchScore);
    
    // Display results
    displayResults(results, term);
}

// Display search results
function displayResults(results, searchTerm) {
    const container = document.getElementById('resultsContainer');
    const statsContainer = document.getElementById('searchStats');
    
    if (results.length === 0) {
        container.innerHTML = `
            <div class="no-results">
                <div class="no-results-icon">🔍</div>
                <h3>لا توجد نتائج مطابقة</h3>
                <p>لم نجد أي محتوى يحتوي على "<strong>${escapeHtml(searchTerm)}</strong>"</p>
                <p>💡 حاول استخدام كلمات مفتاحية مختلفة أو ابحث عن: نايتنجيل، مهارات التقييم، نظرية البيئة</p>
            </div>
        `;
        statsContainer.innerHTML = '';
        return;
    }
    
    statsContainer.innerHTML = `
        <span>📊 تم العثور على ${results.length} نتيجة للبحث عن "${escapeHtml(searchTerm)}"</span>
    `;
    
    let html = '';
    
    results.forEach(result => {
        const chapterData = knowledgeData.chapters[result.id];
        
        html += `
            <div class="chapter-card">
                <div class="chapter-header">
                    <div class="chapter-title">📖 الفصل ${result.id}: ${escapeHtml(result.title)}</div>
                </div>
        `;
        
        // Summary with highlight
        if (result.summaryMatch || result.matchScore > 0) {
            html += `
                <div class="chapter-summary">
                    <div class="summary-label">📝 ملخص الفصل</div>
                    <div class="summary-text">${highlightText(chapterData.summary, searchTerm)}</div>
                </div>
            `;
        }
        
        // Details
        if (result.details.length > 0 || (chapterData.details && searchTerm && chapterData.details.some(d => d.toLowerCase().includes(searchTerm.toLowerCase())))) {
            const detailsToShow = result.details.length > 0 ? result.details : 
                (chapterData.details || []).filter(d => d.toLowerCase().includes(searchTerm.toLowerCase()));
            
            if (detailsToShow.length > 0) {
                html += `
                    <div class="chapter-section">
                        <div class="section-label">📚 شرح مفصل</div>
                        <div class="section-content">
                            <ul>
                `;
                detailsToShow.forEach(detail => {
                    html += `<li>${highlightText(detail, searchTerm)}</li>`;
                });
                html += `</ul></div></div>`;
            }
        }
        
        // Examples
        if (result.examples.length > 0) {
            html += `
                <div class="chapter-section">
                    <div class="section-label">💡 أمثلة عملية</div>
                    <div class="section-content">
            `;
            result.examples.forEach(example => {
                html += `<div class="example-item">${highlightText(example, searchTerm)}</div>`;
            });
            html += `</div></div>`;
        }
        
        // Questions
        if (result.questions.length > 0) {
            html += `
                <div class="chapter-section">
                    <div class="section-label">❓ أسئلة متعلقة بالبحث</div>
                    <div class="questions-grid">
            `;
            result.questions.forEach((q, idx) => {
                const questionHighlighted = highlightText(q.question, searchTerm);
                const answerHighlighted = highlightText(q.answer, searchTerm);
                html += `
                    <div class="question-item" data-qidx="${result.id}_${idx}">
                        <div class="question-text" onclick="toggleAnswer('${result.id}_${idx}')">
                            <span>${questionHighlighted}</span>
                            <span class="toggle-icon">▼</span>
                        </div>
                        <div class="answer-text" id="answer-${result.id}_${idx}">
                            ${answerHighlighted}
                        </div>
                    </div>
                `;
            });
            html += `</div></div>`;
        }
        
        html += `</div>`;
    });
    
    container.innerHTML = html;
}

// Show welcome message
function showWelcomeMessage() {
    const container = document.getElementById('resultsContainer');
    const statsContainer = document.getElementById('searchStats');
    
    statsContainer.innerHTML = '';
    container.innerHTML = `
        <div class="welcome-message">
            <div class="welcome-icon">📖</div>
            <h3>مرحباً بك في قاعدة المعرفة التمريضية</h3>
            <p>استخدم مربع البحث أعلاه للبحث في محتوى الفصل الأول.<br>
            يمكنك البحث عن: مصطلحات، مفاهيم، نظريات، أسئلة، أو أي كلمة تريدها.</p>
            <div class="suggestions">
                <span>💡 اقتراحات للبحث:</span>
                <button class="suggestion-btn">نايتنجيل</button>
                <button class="suggestion-btn">نظرية البيئة</button>
                <button class="suggestion-btn">المهارات التمريضية</button>
                <button class="suggestion-btn">التعليم المستمر</button>
                <button class="suggestion-btn">ما هي الممارسة المبنية على الدليل؟</button>
            </div>
        </div>
    `;
    
    // Re-attach suggestion button events
    document.querySelectorAll('.suggestion-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.getElementById('searchInput').value = btn.textContent;
            document.getElementById('clearSearch').style.display = 'flex';
            performSearch(btn.textContent);
        });
    });
}

// Show error message if data fails to load
function showErrorMessage() {
    const container = document.getElementById('resultsContainer');
    container.innerHTML = `
        <div class="no-results">
            <div class="no-results-icon">⚠️</div>
            <h3>حدث خطأ في تحميل البيانات</h3>
            <p>يرجى التأكد من وجود ملف data.json في نفس المجلد.</p>
        </div>
    `;
}

// Helper: Highlight search term in text
function highlightText(text, searchTerm) {
    if (!searchTerm || !text) return escapeHtml(text);
    
    const escapedSearch = escapeRegExp(searchTerm);
    const regex = new RegExp(`(${escapedSearch})`, 'gi');
    return escapeHtml(text).replace(regex, `<mark class="highlight">$1</mark>`);
}

// Helper: Escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Helper: Escape regex
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Toggle answer visibility
function toggleAnswer(id) {
    const answerElement = document.getElementById(`answer-${id}`);
    if (answerElement) {
        answerElement.classList.toggle('show');
        const toggleIcon = answerElement.previousElementSibling.querySelector('.toggle-icon');
        if (toggleIcon) {
            toggleIcon.textContent = answerElement.classList.contains('show') ? '▲' : '▼';
        }
    }
}

// Make toggleAnswer globally accessible
window.toggleAnswer = toggleAnswer;
