// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * Get the current URL.
 *
 * @param {function(string)} callback - called when the URL of the current tab
 *   is found.
 */
WEBSITE_URL = "";

function getCurrentTabUrl(callback) {
  // Query filter to be passed to chrome.tabs.query - see
  // https://developer.chrome.com/extensions/tabs#method-query
  var queryInfo = {
    active: true,
    currentWindow: true
  };

  chrome.tabs.query(queryInfo, function(tabs) {
    // chrome.tabs.query invokes the callback with a list of tabs that match the
    // query. When the popup is opened, there is certainly a window and at least
    // one tab, so we can safely assume that |tabs| is a non-empty array.
    // A window can only have one active tab at a time, so the array consists of
    // exactly one tab.
    var tab = tabs[0];

    // A tab is a plain object that provides information about the tab.
    // See https://developer.chrome.com/extensions/tabs#type-Tab
    var url = tab.url;

    // tab.url is only available if the "activeTab" permission is declared.
    // If you want to see the URL of other tabs (e.g. after removing active:true
    // from |queryInfo|), then the "tabs" permission is required to see their
    // "url" properties.
    console.assert(typeof url == 'string', 'tab.url should be a string');

    callback(url);
  });

  // Most methods of the Chrome extension APIs are asynchronous. This means that
  // you CANNOT do something like this:
  //
  // var url;
  // chrome.tabs.query(queryInfo, function(tabs) {
  //   url = tabs[0].url;
  // });
  // alert(url); // Shows "undefined", because chrome.tabs.query is async.
}

/**
 * @param {string} searchTerm - Search term for Google Image search.
 * @param {function(string,number,number)} callback - Called when an image has
 *   been found. The callback gets the URL, width and height of the image.
 * @param {function(string)} errorCallback - Called when the image is not found.
 *   The callback gets a string that describes the failure reason.
 */
function getImageUrl(searchTerm, callback, errorCallback) {
  // Google image search - 100 searches per day.
  // https://developers.google.com/image-search/
  var searchUrl = 'https://ajax.googleapis.com/ajax/services/search/images' +
    '?v=1.0&q=' + encodeURIComponent(searchTerm);
  var x = new XMLHttpRequest();
  x.open('GET', searchUrl);
  // The Google image search API responds with JSON, so let Chrome parse it.
  x.responseType = 'json';
  x.onload = function() {
    // Parse and process the response from Google Image Search.
    var response = x.response;
    if (!response || !response.responseData || !response.responseData.results ||
        response.responseData.results.length === 0) {
      errorCallback('No response from Google Image search!');
      return;
    }
    var firstResult = response.responseData.results[0];
    // Take the thumbnail instead of the full image to get an approximately
    // consistent image size.
    var imageUrl = firstResult.tbUrl;
    var width = parseInt(firstResult.tbWidth);
    var height = parseInt(firstResult.tbHeight);
    console.assert(
        typeof imageUrl == 'string' && !isNaN(width) && !isNaN(height),
        'Unexpected respose from the Google Image Search API!');
    callback(imageUrl, width, height);
  };
  x.onerror = function() {
    errorCallback('Network error.');
  };
  x.send();
}

function renderStatus(statusText, url) {
  document.getElementById('status').textContent = statusText;
  document.getElementById('url').textContent = url;
}

function renderComments(comments) {
  var commentsDiv = document.getElementById("comments");
  commentsDiv.innerHTML = "";
  for(var i = 0; i < comments.length; i++) {
    var commentDiv = document.createElement("div");
    commentDiv.setAttribute("id", "hv_comment_"+comments[i].id);
    commentDiv.setAttribute("class", "comment");

    var commentImg = document.createElement("img");
    commentImg.setAttribute("src", "avatar_default.png");

    commentDiv.appendChild(commentImg);

    var commentHeader = document.createElement("div");
    commentHeader.innerHTML += '<b>vonsuu</b><span class="timeAgo"> 4 hours ago</span><span style="float: right;">+ -</span>';

    commentDiv.appendChild(commentHeader);

    var commentContent = document.createTextNode(comments[i].content);

    commentDiv.appendChild(commentContent);   

    commentsDiv.appendChild(commentDiv);
    //
    //var newDiv = document.createElement("div");
    //newDiv.setAttribute("id", "hv_comment_"+comments[i].id);
    //var newContent = document.createTextNode(comments[i].content);   
    //newDiv.appendChild(newContent);
    //var commentsDiv = document.getElementById("comments"); 
    //commentsDiv.appendChild(newDiv);
  }
}

function initPlugin(url){
    var api = "http://localhost:8080/api/website/";
    var params = {
      "uri": url
    }
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open("POST", api, true);
    xmlhttp.setRequestHeader("Content-type", "application/json");
    xmlhttp.send(JSON.stringify(params));
    xmlhttp.onreadystatechange = function () { //Call a function when the state changes.
      if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
          //alert(xmlhttp.responseText);
          var response = JSON.parse(this.responseText);
          WEBSITE_ID = response.id;
          renderComments(response.comments);
      }
    }
}
 
function addComment(params) {
  var xmlhttp = new XMLHttpRequest();
  var api = "http://localhost:8080/api/website/"+WEBSITE_ID+"/comments";
  xmlhttp.open("POST", api, true);
  xmlhttp.setRequestHeader("Content-type", "application/json");
  xmlhttp.send(JSON.stringify(params));
  xmlhttp.onreadystatechange = function () { //Call a function when the state changes.
    if (xmlhttp.readyState == 4) {
      getComments(function(comments){
        renderComments(comments);
      });
    }
  }
}

function getComments(callback) {
  var xmlhttp = new XMLHttpRequest();
  var api = "http://localhost:8080/api/website/"+WEBSITE_ID+"/comments";  
  var comments = {"id":0,"content":"blabla"};
  xmlhttp.open("GET", api, true);
  xmlhttp.setRequestHeader("Content-type", "application/json");
  xmlhttp.send();
  xmlhttp.onreadystatechange = function () { //Call a function when the state changes.
    if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
      comments = JSON.parse(this.responseText);
    }
    callback(comments);
  }
}

document.addEventListener('DOMContentLoaded', function() {
  var api = "http://localhost:8080/api/website/";
  var addCommentSubmit = document.getElementById('comment_submit');

  getCurrentTabUrl(function(url) {
    WEBSITE_URL = url;
    document.getElementById('url').textContent = url;
    initPlugin(WEBSITE_URL);
  });

  addCommentSubmit.addEventListener('click', function(event) {
    event.preventDefault();
    var commentContent = document.getElementById('comment_content').value;
    var params = {
      "content" : commentContent,
      "websiteId" : WEBSITE_ID
    }
    addComment(params);
  });
});


