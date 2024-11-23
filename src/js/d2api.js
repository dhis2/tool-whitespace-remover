const dhisDevConfig = DHIS_CONFIG; // eslint-disable-line
const isDev = "baseUrl" in dhisDevConfig;
const baseUrl = isDev ? dhisDevConfig.baseUrl : "../../..";

import $ from "jquery";

//GET from API async
export const d2Get = async (endpoint) => {
    return new Promise(function (resolve, reject) {
        $.ajax({
            "type": "GET",
            "url": baseUrl + endpoint,
            "dataType": "json",
            ...isDev && { "headers": { "Authorization": "Basic " + btoa(dhisDevConfig.username + ":" + dhisDevConfig.password) } },
            "success": function (data) {
                resolve(data);
            },
            "error": function (err) {
                console.log("ERROR in GET:");
                console.log(err);
                reject(err);
            }
        });
    });
};

//POST to API async
export const d2PostJson = async (endpoint, body) => {
    return new Promise(function (resolve, reject) {
        $.ajax({
            "type": "POST",
            "url": baseUrl + endpoint,
            "dataType": "json",
            "data": body,
            ...isDev && { "headers": { "Authorization": "Basic " + btoa(dhisDevConfig.username + ":" + dhisDevConfig.password) } },
            "success": function (data) {
                resolve(data);
            },
            "error": function (err) {
                console.log("ERROR in POST:");
                console.log(err);
                reject(false);
            }
        });
    });
};


// PUT to API async
export const d2PutJson = async (endpoint, body) => {
    return new Promise(function (resolve, reject) {
        $.ajax({
            "type": "PUT",
            "url": baseUrl + endpoint,
            "dataType": "json",
            "contentType": "application/json",
            "data": JSON.stringify(body),
            ...isDev && { "headers": { "Authorization": "Basic " + btoa(dhisDevConfig.username + ":" + dhisDevConfig.password) } },
            "success": function (data) {
                resolve(data);
            },
            "error": function (err) {
                console.log("ERROR in PUT:");
                console.log(err);
                reject(err);
            }
        });
    });
};
