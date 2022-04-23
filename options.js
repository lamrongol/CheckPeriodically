document.addEventListener('DOMContentLoaded', () =>{  
//Pages list
const days_of_week = {
    0 : "Sun",
    1 : "Mon",
    2 : "Tue",
    3 : "Wed",
    4 : "Thr",
    5 : "Fri",
    6 : "Sat"
};

const reverse_days_of_Week = {
    "Sun": 0,
    "Mon": 1,
    "Tue": 2,
    "Wed": 3,
    "Thr": 4,
    "Fri": 5,
    "Sat": 6
};

let selected_row = null;
let origin_url = null;

const table = new Tabulator("#grid-view", {
  columns: [{
      title: "URL",
      field: "url",
      editor:"input",
      width:"30%"
    },
    {
      title: "Title",
      field: "title",
      editor:"input",
      width:"30%"
    },
    {
      title: "Interval",
      field: "interval",
      sorter: "number",
      editor:"number",
      width:"7%"
    },
    {
      title: "Day of week",
      field: "day_of_week",
      sorter: (day1, day2) => (dayOfWeek[day1] - dayOfWeek[day2]),
      editor:"select", editorParams:{values:["Sun", "Mon", "Tue", "Wed", "Thr", "Fri", "Sat"]},
      width:"8%"
    },
    {
      title: "Last shown time",
      field: "last_shown_time",
      sorter: "datetime",
      width: "25%"
    },
  ],
  cellVertAlign: "middle",
  maxHeight: "60%",
  //layout: "fitData",
  addRowPos: "top",
  selectable: 1,
  rowSelectionChanged: function(data, rows) {
    if(data[0]){
      selected_row = rows[0];
      origin_url = data[0].url;
    } 
    else{
      selected_row = null;
      origin_url = null;
    } 
  },
  rowDblClick:function(e, row){
    //e - the click event object
    const url = row.getData().url;
    chrome.tabs.create({url:url})

    selected_row = row;
    origin_url = url;
  },
  cellEdited:function(cell){
    const data = cell.getData();
    //if(data.url && !data.title) cell.getRow()
    if(!data.url || !data.interval) return;

    chrome.storage.local.get("pages", (result) => {
      if(origin_url && origin_url!=data.url){
        delete result.pages[origin_url]
      }
      const day_of_week_int = data.day_of_week ? reverse_days_of_Week[data.day_of_week] : null;
      const last_shown_time = result.pages[data.url] ? result.pages[data.url].last_shown_time : new Date().getTime();
      result.pages[data.url] = {
        interval:data.interval,
        last_shown_time:last_shown_time,
        day_of_week:day_of_week_int,
        title:data.title
      }

      chrome.storage.local.set({"pages":result.pages}, () => {})
    })
  },
});

chrome.storage.local.get("pages", (result) => {
  for(const [url, detail] of Object.entries(result.pages)){
    const day_of_week_name = detail.interval%7==0 ? days_of_week[detail.day_of_week] : null;
    table.addData({url:url, title:detail.title, interval: detail.interval, 
      day_of_week:day_of_week_name, last_shown_time:new Date(detail.last_shown_time)})
  }
  table.setSort("last_shown_time", "desc");
});

document.getElementById("delete").addEventListener("click", function(){
  if(!selected_row) return;
  const ret = window.confirm("Do you really delete?");
  if(!ret) return;

  chrome.storage.local.get("pages", (result) => {
    delete result.pages[origin_url]
    chrome.storage.local.set(
        {"pages":result.pages}, () => {
          selected_row.delete();
        }               
    )
  })
});

document.getElementById("add").addEventListener("click", function(){
  table.addRow({});
});

//Interval menu list
const interval_list = document.getElementById('interval_list');
let menu;
chrome.storage.local.get("menu", (result) => {
  menu = result.menu;
  for(const interval of menu){
    const opt = document.createElement("option");
    opt.value = interval;
    opt.innerText = interval;
    
    interval_list.appendChild(opt);
  }
});

document.getElementById("delete_interval").addEventListener("click", function(){
  if(interval_list.selectedIndex==-1) return;
  
  menu.splice(interval_list.selectedIndex, 1)
  chrome.storage.local.set(
      {"menu":menu}, () => {
        interval_list.remove(interval_list.selectedIndex);
      }               
  )
});

function add_interval(){
  const interval_input = document.getElementById("interval_input");
  const new_interval = parseInt(interval_input.value);
  if(!Number.isInteger(new_interval) || new_interval<=0){
    alert("Please set integer over zero");
    return;
  }

  let insertIndex = -1;
  for(const [index, interval] of menu.entries()){
    if(new_interval<interval){
      insertIndex = index;
      break;
    }
  }
  if(insertIndex==-1) insertIndex = menu.length;

  menu.splice(insertIndex, 0, new_interval);
  chrome.storage.local.set({"menu":menu})

  const opt = document.createElement("option");
  opt.value = new_interval;
  opt.innerText = new_interval;
  if(insertIndex<menu.length)interval_list.insertBefore(opt, interval_list.children[insertIndex]);
  else interval_list.appendChild(opt);
  interval_input.value = "";
}
document.getElementById("add_interval").addEventListener("click", add_interval);
document.getElementById("interval_input").addEventListener("keydown", (e)=>{
  if(e.code == 'Enter') add_interval();
});

return true;
});