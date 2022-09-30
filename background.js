chrome.runtime.onInstalled.addListener((details) => {
    if(details.reason == "install"){
        //Init data
        chrome.storage.local.set({'pages': {}})
        chrome.storage.local.set({"last_check_time": new Date().getTime()})
        chrome.storage.local.set({"menu": [1,3,7,14,30,90,180,365,1000]})
    }
});

//Think "Today" breakpoint is following
const TODAY_BREAKPOINT_HOUR = 5;

const CHECK_FREQUENCY_MINUTES = 10;

const checkPeriodically = () => {
    chrome.storage.local.get(['pages', "last_check_time"], (result) => {
        if(!result.pages) return;

        const now = new Date();
        const now_seconds = now.getTime();
        const last_check_time = result.last_check_time;
        const is_today_breakpoint = now.getHours()==TODAY_BREAKPOINT_HOUR && now.getMinutes()<CHECK_FREQUENCY_MINUTES;

        let browsing_list = [];
        for(const [url, detail] of Object.entries(result.pages)){
            let browse = false;
            const elapsed_time = now_seconds - detail.last_shown_time;
            if(elapsed_time > detail.interval*86400*1000){
                browse = true;
            }else if((now_seconds-last_check_time)>2*CHECK_FREQUENCY_MINUTES*60*1000 ||//もし、10分ごとにチェックしてるはずなのに前回のチェック時間が20分以上前なら（Chrome の終了や休止状態が途中であったなら）、起動直後と判断
                    is_today_breakpoint){
                let today_start_time = now_seconds-((((now.getHours()-TODAY_BREAKPOINT_HOUR)*60)+now.getMinutes())*60+now.getSeconds())*1000;
                if(today_start_time>now_seconds) today_start_time -= 86400*1000//modify when now is between AM 0:00-4:00
                
                const elapsed_days = Math.ceil((today_start_time-detail.last_shown_time)/(86400*1000));
                if(elapsed_days<=0) continue;

                if(elapsed_days >= detail.interval) browse = true;
                else if(detail.interval%7==0){//if interval is n weeks, priority is given to the day of the week
                    if(((detail.interval - elapsed_days)/7 < 1.0) && now.getDay()==detail.day_of_week) browse = true;
                }
            }

            //browse = true;//For debug
            if(browse){
                browsing_list.push(url)
                detail.last_shown_time = now_seconds;
            }
        }
        chrome.storage.local.set({"last_check_time": now_seconds})
        if(browsing_list.length){
            for(const [index, url] of browsing_list.entries()){
                setTimeout(()=>{chrome.tabs.create({url:url})}, index*1000);
            }

            chrome.storage.local.set({"pages": result.pages});
        }
    });   
}

function reloadBadge(tab){
    chrome.storage.local.get('pages', (result) => {
        if(!result || !result.pages){
            return;
        } 
        const detail = result.pages[tab.url];
        if(detail){
            chrome.action.setBadgeText({"text":String(detail.interval)})
            chrome.action.setBadgeBackgroundColor({color: "black"});
        }else{
            chrome.action.setBadgeText({"text":""})
        }
    })
}

chrome.tabs.onActivated.addListener((activeInfo) => {
    chrome.tabs.get(activeInfo.tabId, (tab) =>{
        reloadBadge(tab)
    })
})

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    reloadBadge(tab)
})


setInterval(checkPeriodically, CHECK_FREQUENCY_MINUTES*60*1000);//execute every CHECK_FREQUENCY_MINUTES
setTimeout(checkPeriodically, 3000);
