//Set "Today" breakpoint as following like social game 
const TODAY_BREAKPOINT_HOUR = 6;

const CHECK_FREQUENCY_MINUTES = 10;

const ONE_DAY_SECONDS = 86400 * 1000;

let mainId = null;

const detectMainWindows = () => {
    chrome.windows.getAll({ populate: true, windowTypes: ['normal'] }, (windows) => {
        if (windows.length == 1) {
            mainId = null;
            return;
        }

        const sortedWindowIdArray = windows.sort((a, b) => b.tabs.length - a.tabs.length).map((win) => win.id);
        mainId = sortedWindowIdArray[0];
    }
    )
}

chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason == "install") {
        //Init data
        chrome.storage.local.set({ 'pages': {} });
        chrome.storage.local.set({ "last_check_time": new Date().getTime() });
        chrome.storage.local.set({ "menu": [1, 3, 7, 14, 30, 90, 180, 365, 1000] });

        detectMainWindows();
    }
});

chrome.runtime.onStartup.addListener(() => {
    setTimeout(() => {
        detectMainWindows();
        checkPeriodically();
    }, 10 * 1000);
}
);
chrome.windows.onCreated.addListener(detectMainWindows);
chrome.windows.onRemoved.addListener(detectMainWindows);


const checkPeriodically = () => {
    chrome.storage.local.get(['pages', "last_check_time"], (result) => {
        if (!result.pages) return;

        const now = new Date();
        const now_seconds = now.getTime();
        const last_check_time = result.last_check_time;
        const is_today_breakpoint = now.getHours() == TODAY_BREAKPOINT_HOUR &&
            now.getMinutes() < CHECK_FREQUENCY_MINUTES * 1.5;//inclease to allow time error

        let browsing_list = [];
        for (const [url, detail] of Object.entries(result.pages)) {
            let browse = false;
            const elapsed_time = now_seconds - detail.last_shown_time;
            if (elapsed_time > detail.interval * ONE_DAY_SECONDS) {
                browse = true;
            } else if ((now_seconds - last_check_time) > 2 * CHECK_FREQUENCY_MINUTES * 60 * 1000 || //If last_check_time is more than CHECK_FREQUENCY_MINUTES * 2 ago, determine now is shortly after booting time.
                is_today_breakpoint) {
                let today_start_time = now_seconds - ((now.getHours() - TODAY_BREAKPOINT_HOUR) * 3600 + now.getMinutes() * 60 + now.getSeconds()) * 1000;
                if (today_start_time > now_seconds) today_start_time -= ONE_DAY_SECONDS//modify when now is between AM 0:00-5:00

                const elapsed_days = Math.ceil((today_start_time - detail.last_shown_time) / ONE_DAY_SECONDS);
                if (elapsed_days <= 0) continue;

                if (elapsed_days >= detail.interval) browse = true;
                else if (detail.interval % 7 == 0) {//if interval is n weeks, priority is given to the day of the week
                    if (((detail.interval - elapsed_days) / 7 < 1.0) && now.getDay() == detail.day_of_week && now.getHours() >= TODAY_BREAKPOINT_HOUR) browse = true;
                }
            }

            if (browse) {
                browsing_list.push(url)
                detail.last_shown_time = now_seconds;
            }
        }
        chrome.storage.local.set({ "last_check_time": now_seconds })
        if (browsing_list.length) {
            for (const [index, url] of browsing_list.entries()) {
                if (mainId == null) setTimeout(() => { chrome.tabs.create({ url: url }) }, index * 1000);
                else setTimeout(() => { chrome.tabs.create({ url: url, windowId: mainId }) }, index * 1000);
            }

            chrome.storage.local.set({ "pages": result.pages });
        }
    });
}

function reloadBadge(tab) {
    if (!tab || !tab.url) return;
    chrome.storage.local.get('pages', (result) => {
        if (!result || !result.pages) {
            return;
        }
        const detail = result.pages[tab.url];
        if (detail) {
            chrome.action.setBadgeText({ "text": String(detail.interval) })
            chrome.action.setBadgeBackgroundColor({ color: "black" });
        } else {
            chrome.action.setBadgeText({ "text": "" })
        }
    })
}

chrome.tabs.onActivated.addListener((activeInfo) => {
    chrome.tabs.get(activeInfo.tabId, (tab) => {
        reloadBadge(tab)
    })
})

chrome.tabs.onUpdated.addListener((_tabId, _changeInfo, tab) => {
    reloadBadge(tab)
})

// service_worker(including alarms) sleeps when browser is not active for a while 
chrome.alarms.create("periodic", { periodInMinutes: 10 });
chrome.alarms.onAlarm.addListener(function (_alarm) {
    detectMainWindows();
    checkPeriodically();
});