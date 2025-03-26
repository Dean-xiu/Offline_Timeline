const eventsKey = "timelineEvents";
let events = JSON.parse(localStorage.getItem(eventsKey) || "[]");

const timelineContainer = document.querySelector(".timeline-container");
const eventsContainer = document.querySelector(".events-container");
const eventModal = document.getElementById("event-modal");
const eventStartDateInput = document.getElementById("event-start-date");
const eventEndDateInput = document.getElementById("event-end-date");
const eventTextInput = document.getElementById("event-text");
const saveEventBtn = document.getElementById("save-event");
const closeModalBtn = document.getElementById("close-modal");
const addEventBtn = document.getElementById("add-event");

let editingEventId = null;

let monthColors = {};
function getRandomColor() {
    const hue = Math.floor(Math.random() * 360); // 0-360 之间的色相值
    return `hsl(${hue}, 70%, 80%)`; 
}

// 获取某个月的颜色，如果没有则生成新的
function getMonthColor(date) {
    const month = date.slice(0, 7); // 获取 "YYYY-MM" 作为月份标识
    if (!monthColors[month]) {
        monthColors[month] = getRandomColor();
    }
    return monthColors[month];
}

function getTodayDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function renderTimeline() {
    timelineContainer.innerHTML = "";
    eventsContainer.innerHTML = "";

    const groupedEvents = {};

    events.forEach(event => {
        if (!groupedEvents[event.startDate]) {
            groupedEvents[event.startDate] = [];
        }
        groupedEvents[event.startDate].push(event);
    });
	
	// 如果没有事件，先显示今天的日期
    if (Object.keys(groupedEvents).length === 0) {
        const todayDate = getTodayDate();
        groupedEvents[todayDate] = [];
    }

    let maxHeight = 0;

    Object.keys(groupedEvents).sort().forEach(startDate => {	
		const monthColor = getMonthColor(startDate);
		
		const timeline = document.createElement("div");
        timeline.className = "timeline";
        timeline.style.backgroundColor = monthColor; 
		
        const dateElement = document.createElement("div");
        dateElement.className = "date-label";
		dateElement.style.backgroundColor = monthColor;
		
		const spanElement = document.createElement("span");
		spanElement.className = "date-label-content";
		spanElement.textContent = startDate;
		
		dateElement.appendChild(spanElement);
        timeline.appendChild(dateElement);
		timelineContainer.appendChild(timeline);

        const row = document.createElement("div");
        row.className = "event-row";
        groupedEvents[startDate].forEach(event => {
            const eventElement = document.createElement("div");
            eventElement.className = "event";
			eventElement.style.borderLeft = `3px solid ${monthColor}`;
			
            const eventTitle = document.createElement("div");
            eventTitle.className = "event-title";
            eventTitle.textContent = event.startDate === event.endDate ? event.startDate : `${event.startDate} - ${event.endDate}`;

			
			const eventContent = document.createElement("div");
            eventContent.className = "event-content";
            eventContent.textContent = event.text;

            const deleteBtn = document.createElement("span");
            deleteBtn.textContent = "❌";
            deleteBtn.className = "delete";
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                deleteEvent(event.id);
            };
			
			
			eventElement.appendChild(deleteBtn); 
            eventElement.appendChild(eventTitle);
            eventElement.appendChild(eventContent);
            eventElement.onclick = () => openEditModal(event);


            row.appendChild(eventElement);
        });

        eventsContainer.appendChild(row);

        maxHeight = Math.max(maxHeight, row.offsetTop + row.offsetHeight);
    });

    timelineContainer.style.height = `${maxHeight}px`;
}

// 自动按月保存数据
function autoSaveEvents() {
    const today = new Date();
    const currentMonth = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}`;

    // 检查是否是月底 (28-31号之间的某一天)
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    if (today.getDate() === lastDayOfMonth.getDate()) {
        const monthEvents = events.filter(event => event.startDate.slice(0, 7) === currentMonth);
        const dataStr = JSON.stringify(monthEvents);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${currentMonth}_events.json`;  // 文件名包含月份
        a.click();
        URL.revokeObjectURL(url);
    }
}

// 导出数据为文件
function exportDataToFile() {
    const dataStr = JSON.stringify(events);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
	
	const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0'); // 补0
    const day = today.getDate().toString().padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;

    // 生成带日期的文件名
    const fileName = `timeline_data_${formattedDate}.json`;
    const a = document.createElement("a");
    a.href = url;
    a.download = "timeline_data.json";
    a.click();
    URL.revokeObjectURL(url);
}

// 导入数据
function importDataFromFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const dataStr = e.target.result;
        try {
            const data = JSON.parse(dataStr);
            events = data; // 更新数据
            localStorage.setItem(eventsKey, JSON.stringify(events)); // 保存到 localStorage
            renderTimeline(); // 重新渲染时间线
        } catch (error) {
            alert("无法读取文件，数据格式错误！");
        }
    };
    reader.readAsText(file);
}

function saveEvent() {
    const startDate = eventStartDateInput.value;
    const endDate = eventEndDateInput.value;
    const text = eventTextInput.value.trim();

    if (!startDate || !endDate || !text) {
        alert("请输入完整信息");
        return;
    }

    if (new Date(startDate) > new Date(endDate)) {
        alert("开始日期不能晚于结束日期");
        return;
    }

    const event = {
        id: editingEventId || Date.now(),
        startDate,
        endDate,
        text
    };

    if (editingEventId) {
        const eventIndex = events.findIndex(e => e.id === editingEventId);
        if (eventIndex !== -1) {
            events[eventIndex] = event;
        }
    } else {
        events.push(event);
    }

    localStorage.setItem(eventsKey, JSON.stringify(events));
    closeModal();
    renderTimeline();
}

function deleteEvent(id) {
    events = events.filter(event => event.id !== id);
    localStorage.setItem(eventsKey, JSON.stringify(events));
    renderTimeline();
}

function openEditModal(event = {}) {
    eventStartDateInput.value = event.startDate || getTodayDate();
    eventEndDateInput.value = event.endDate || getTodayDate();
    eventTextInput.value = event.text || '';
    editingEventId = event.id || null;

    eventModal.style.display = "flex";
}

function closeModal() {
    eventModal.style.display = "none";
}

addEventBtn.onclick = () => openEditModal({});
closeModalBtn.onclick = closeModal;
saveEventBtn.onclick = saveEvent;

// 导出按钮
const exportBtn = document.getElementById("export-btn");
exportBtn.onclick = exportDataToFile;

// 导入按钮
const importBtn = document.getElementById("import-btn");
importBtn.addEventListener("change", importDataFromFile);

// 设置一个定时器，每天检查是否是月底
setInterval(autoSaveEvents, 24 * 60 * 60 * 1000);  // 每天检查一次

// 立即加载页面并渲染时间线
window.onload = renderTimeline;
