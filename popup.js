'use strict';

function click(e) {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        const currentTab = tabs[0]; // there will be only one in this array
        const url = currentTab.url;
        const interval = e.target.id;
        const title = currentTab.title
        const last_shown_time = new Date().getTime();
        let day_of_week;
        if(interval%7==0){
            day_of_week = new Date().getDay();
        }
    
        chrome.storage.sync.get("pages", (result) => {
            result.pages[url] = {
                interval:interval,
                last_shown_time:last_shown_time,
                day_of_week:day_of_week,
                title:title
            }
            chrome.storage.sync.set(
                {"pages":result.pages}, () => {
                    chrome.browserAction.setBadgeText({text:interval})
    
                    window.close();            
                }               
            )
        })
    }
    );
};

function deleteFromData(url){
    chrome.storage.sync.get("pages", (result) => {
        delete result.pages[url]
        chrome.storage.sync.set({"pages":result.pages}, () => {
                chrome.browserAction.setBadgeText({text:""})

                window.close();            
            }               
        )
    })
}

document.addEventListener('DOMContentLoaded', function () {
    chrome.storage.sync.get('menu', (result) => {
        const div = document.getElementById("interval_list");
        for(const interval of result.menu){
            let button = document.createElement("button");
            button.id = interval;
            button.addEventListener('click', click);

            if(interval%365==0){
                if(interval==365) button.innerText = `Browse every 1 year`
                else button.innerText = `Browse every ${interval/365} years`
            } 
            else if(interval==180) button.innerText = `Browse every half year`
            else if(interval%30==0){
                if(interval==30) button.innerText = `Browse every 1 month`
                else button.innerText = `Browse every ${interval/30} months`
            } 
            else if(interval%7==0){
                if(interval==7) button.innerText = `Browse every 1 week`
                else button.innerText = `Browse every ${interval/7} weeks`
            } 
            else {
                if(interval==1) button.innerText = `Browse every 1 day`
                else button.innerText = `Browse every ${interval} days`
            }
            div.appendChild(button);
        }
    })

    document.getElementById("options").addEventListener("click", function(){
        if (chrome.runtime.openOptionsPage) {
            chrome.runtime.openOptionsPage();
        } else {
            window.open(chrome.runtime.getURL('options.html'));
        }
    });
    
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.storage.sync.get('pages', (result) => {
            const detail = result.pages[tabs[0].url];
            if(detail){
                document.getElementById("dont_check").style.display = "block"
                document.getElementById("delete").addEventListener("click", function(){
                    deleteFromData(tabs[0].url);
                });
                const opt = document.getElementById(detail.interval);
                if(opt) opt.style.backgroundColor = "red"
            } 
            else document.getElementById("dont_check").style.display = "none"
        })
    })    
});

