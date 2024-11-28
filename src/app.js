"use strict";

//JS
import { d2Get, d2PutJson } from "./js/d2api.js"; // Assuming d2Get and d2PostJson are stored in api.js
import $ from "jquery"; //eslint-disable-line

//CSS
import "./css/style.css";
import "./css/header.css";
import "materialize-css/dist/css/materialize.min.css";
import M from "materialize-css";



// Function to highlight leading, trailing, and double spaces
function highlightSpaces(string) {
    if (string) {
        return string.replace(/(^\s+)|(\s+$)|(\s{2,})/g, "<span class=\"whitespace-highlight\">$&</span>");
    }
    return string;
}


function quoteString(string) {
    return string ? `"${string}"` : "";
}


async function fetchAndRenderMetadata() {
    $("#loading-indicator").show(); // Show loading indicator
    $(".determinate").css("width", "50%"); // Update progress

    try {
        var requests = [];
        var types = ["name", "code", "description"];

        types.forEach(function (type) {
            requests.push(
                d2Get(`/api/metadata.json?filter=${type}:ilike:%20%20&fields=id,name,shortName,code,description`),
                d2Get(`/api/metadata.json?filter=${type}:$ilike:%20&fields=id,name,shortName,code,description`),
                d2Get(`/api/metadata.json?filter=${type}:ilike$:%20&fields=id,name,shortName,code,description`)
            );
        });

        const responses = await Promise.all(requests);

        $(".determinate").css("width", "70%"); // Update progress

        var mergedData = {};
        responses.forEach(function (data) {
            for (var key in data) {
                if (key === "system") continue;
                if (!mergedData[key]) mergedData[key] = [];
                mergedData[key] = mergedData[key].concat(data[key]);
            }
        });

        // Remove duplicates
        for (var key in mergedData) {
            mergedData[key] = mergedData[key].filter((v, i, a) => a.findIndex(t => (t.id === v.id)) === i);
        }

        renderTables(mergedData);
        createTabs(Object.keys(mergedData));

        $(".determinate").css("width", "100%"); // Update progress
        $("#loading-indicator").fadeOut(); // Hide loading indicator
    } catch (err) {
        console.error("Error fetching metadata:", err);
        $("#loading-indicator").fadeOut(); // Hide loading indicator on error
    }
}


function renderTables(data) {
    $("#table-tabs").empty();
    for (var type in data) {
        var objects = data[type];
        var $table = $("<table class=\"highlight striped\">").append(
            $("<thead>").append(
                `<tr>
                    <th><label><input type="checkbox" onclick="selectAll('${type}', this)"/><span></span></label></th>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Short Name</th>
                    <th>Code</th>
                    <th>Description</th>
                    <th>Actions</th>
                    <th>Status</th>
                </tr>`
            ),
            $("<tbody>", { id: `${type}-body` })
        );

        objects.forEach(function (obj) {
            var name = obj.name ? quoteString(highlightSpaces(obj.name)) : "";
            var shortName = obj.shortName ? quoteString(highlightSpaces(obj.shortName)) : "";
            var code = obj.code ? quoteString(highlightSpaces(obj.code)) : "";
            var description = obj.description ? quoteString(highlightSpaces(obj.description)) : "";

            var row = $(`<tr data-id="${obj.id}" data-type="${type}">`).append(
                `<td><label><input type="checkbox" class="row-checkbox" onclick="updateFixButton('${type}')"/><span></span></label></td>
                <td>${obj.id}</td>
                <td>${name}</td>
                <td>${shortName}</td>
                <td>${code}</td>
                <td>${description}</td>
                <td>
                    <div style="display: flex; gap: 5px;">
                        <button class="btn-small waves-effect waves-light blue check-button" onclick="checkConflicts('${type}', '${obj.id}')">Check</button>
                        <button class="btn-small waves-effect waves-light green fix-button" onclick="fixObject('${type}', '${obj.id}')" disabled>Fix</button>
                    </div>
                </td>
                <td class="status-cell"></td>`
            );
            $table.find("tbody").append(row);
        });

        var $container = $("<div>", { class: "table-container", id: `${type}-container` }).append(
            `<h5>${type.charAt(0).toUpperCase() + type.slice(1)}</h5>`,
            $table,
            `<div style="padding-top: 12px"; class="button-group">
                <button class="btn-large waves-effect waves-light yellow darken-2" onclick="checkAll('${type}')">Check Selected</button>
                <button class="btn-large waves-effect waves-light green" id="fix-all-${type}" class="fix-button" onclick="fixAll('${type}')" disabled>Fix Selected</button>
            </div>`
        );

        $("#table-tabs").append($container);
    }
    M.AutoInit(); // Initialize all Materialize elements
}


function createTabs(types) {
    var $tabs = $("<ul class=\"tabs\">");
    types.forEach(function (type) {
        var $tab = $(`<li class="tab col s3"><a href="#${type}-container">${type.charAt(0).toUpperCase() + type.slice(1)}</a></li>`);
        $tabs.append($tab);
    });
    $("#table-tabs").before($tabs);
    setTimeout(() => M.Tabs.init($(".tabs")), 100); // Allow elements to be added before initialization
}


async function checkConflicts(type, id) {
    var row = $(`tr[data-id='${id}']`);
    var endpoint = type;
    var conflictsSummary = [];

    /* eslint-disable no-useless-escape */
    var name = row.find("td:nth-child(3)").text()
        .replace(/^\"/, "") // Remove leading quote
        .replace(/\"$/, "") // Remove trailing quote
        .replace(/\s{2,}/g, " ") // Replace double space with single space
        .trim(); // Remove leading and trailing spaces

    var shortName = row.find("td:nth-child(4)").text()
        .replace(/^\"/, "") // Remove leading quote
        .replace(/\"$/, "") // Remove trailing quote
        .replace(/\s{2,}/g, " ") // Replace double space with single space
        .trim(); // Remove leading and trailing spaces

    var code = row.find("td:nth-child(5)").text()
        .replace(/^\"/, "") // Remove leading quote
        .replace(/\"$/, "") // Remove trailing quote
        .replace(/\s{2,}/g, " ") // Replace double space with single space
        .trim(); // Remove leading and trailing spaces
    /* eslint-enable no-useless-escape */

    var encodedName = encodeURIComponent(name);
    var encodedShortName = encodeURIComponent(shortName);
    var encodedCode = encodeURIComponent(code);

    var requests = [];
    var conflicts = {};

    if (name) {
        requests.push(
            d2Get(`/api/${endpoint}.json?filter=name:eq:${encodedName}&filter=id:!eq:${id}&fields=id,name`).then(data => {
                if (data[endpoint] && data[endpoint].length > 0) conflicts["name"] = data[endpoint];
            }).catch(err => console.error(err.message))
        );
    }
    if (shortName) {
        requests.push(
            d2Get(`/api/${endpoint}.json?filter=shortName:eq:${encodedShortName}&filter=id:!eq:${id}&fields=id,shortName`).then(data => {
                if (data[endpoint] && data[endpoint].length > 0) conflicts["shortName"] = data[endpoint];
            }).catch(err => console.error(err.message))
        );
    }
    if (code) {
        requests.push(
            d2Get(`/api/${endpoint}.json?filter=code:eq:${encodedCode}&filter=id:!eq:${id}&fields=id,code`).then(data => {
                if (data[endpoint] && data[endpoint].length > 0) conflicts["code"] = data[endpoint];
            }).catch(err => console.error(err.message))
        );
    }

    await Promise.all(requests);

    if (Object.keys(conflicts).length > 0) {
        row.find(".status-cell").text("Conflict").addClass("status-conflict").removeClass("status-ready status-error");
        row.find(".row-checkbox").prop("checked", false);
        for (var field in conflicts) {
            if (field !== "id" && field !== "objectName") {
                conflicts[field].forEach(conflict => {
                    conflictsSummary.push({
                        objectName: name,
                        id,
                        property: field.charAt(0).toUpperCase() + field.slice(1),
                        conflictingObjectId: conflict.id
                    });
                });
            }
        }
    } else {
        row.find(".status-cell").text("Ready").addClass("status-ready").removeClass("status-conflict status-error");
        row.find(".fix-button").prop("disabled", false);
        row.find(".row-checkbox").prop("checked", true);
    }

    if (conflictsSummary.length > 0) {
        showConflictSummaryModal(conflictsSummary, 0, 1);
    } else {
        showConflictSummaryModal([], 1, 0);
    }
    updateFixAllButton(type);
}


async function fixObject(type, id) {
    var row = $(`tr[data-id='${id}']`);
    var endpoint = type;
    var importErrors = [];
    var data = {};

    try {
        data = await d2Get(`/api/${endpoint}/${id}?fields=:owner`);
        if (data.name) data.name = data.name.replace(/\s\s+/g, " ").trim();
        if (data.shortName) data.shortName = data.shortName.replace(/\s\s+/g, " ").trim();
        if (data.code) data.code = data.code.replace(/\s\s+/g, " ").trim();
        if (data.description) data.description = data.description.replace(/\s\s+/g, " ").trim();

        await d2PutJson(`/api/${endpoint}/${id}`, data);

        row.remove();
        updateFixAllButton(type);
        checkRemainingRows(type);

    } catch (err) {
        row.find(".status-cell").text("Error").addClass("status-error").removeClass("status-ready status-conflict");
        row.find(".fix-button").prop("disabled", true);
        row.find(".row-checkbox").prop("checked", false);
        importErrors.push({ name: data.name, id, message: err.message });
        console.error(err);
    }

    if (importErrors.length > 0) {
        showImportResultsModal("Update of ${data.name} failed.", importErrors);
    }
}


function showConflictSummaryModal(conflictsSummary, noConflictCount, conflictCount) {
    var $modal = $("#conflict-summary-modal");
    var $tableBody = $("#conflict-summary-table tbody");
    var $summaryLine = $("#conflict-summary-table-summary");
    var $description = $("#conflict-summary-table-description");
    var $table = $("#conflict-summary-table");

    $tableBody.empty(); // Clear the table body

    if (conflictsSummary.length > 0) {
        conflictsSummary.forEach(function (conflict) {
            var row = `<tr>
                    <td>${conflict.objectName}</td>
                    <td>${conflict.id}</td>
                    <td>${conflict.property}</td>
                    <td>${conflict.conflictingObjectId}</td>
                </tr>`;
            $tableBody.append(row);
        });
        $description.show();
        $table.show();
        $summaryLine.text(`${noConflictCount} rows did not have any conflicts, ${conflictCount} rows had one or more conflicts.`);
    } else {
        $description.hide();
        $table.hide();
        $summaryLine.text(`${noConflictCount} rows did not have any conflicts.`);
    }

    console.log($modal);
    var instance = M.Modal.getInstance($modal[0]);
    instance.open();

    // Scroll to top of the page
    document.getElementById("conflict-summary-modal").scrollIntoView();
}


function showImportResultsModal(importResults, importErrors = []) {
    var $modal = $("#import-results-modal");
    var $importResultsSummary = $("#import-results-summary");
    var $errorsTableBody = $("#import-errors-table tbody");

    $importResultsSummary.text(importResults);
    $errorsTableBody.empty();

    if (importErrors.length > 0) {
        importErrors.forEach(function (error) {
            var row = `<tr>
                    <td>${error.name}</td>
                    <td>${error.id}</td>
                    <td>${error.message}</td>
                </tr>`;
            $errorsTableBody.append(row);
        });
        $("#import-errors-table").show();
    } else {
        $("#import-errors-table").hide();
    }

    console.log($modal);
    var instance = M.Modal.getInstance($modal[0]);
    instance.open();

    // Scroll to top of the page
    document.getElementById("import-results-modal").scrollIntoView();
}


function checkAll(type) {
    var $selectedRows = $(`#${type}-body tr`).filter(function () {
        return $(this).find(".row-checkbox").is(":checked");
    });

    var totalChecked = $selectedRows.length;
    var conflictsSummary = [];
    var batchSize = 20; // Set the batch size
    var batches = [];

    // Split requests into batches
    for (var i = 0; i < $selectedRows.length; i += batchSize) {
        batches.push($selectedRows.slice(i, i + batchSize));
    }

    function processBatch(batch) {
        var batchPromises = [];
        batch.each(function () {
            var id = $(this).data("id");
            batchPromises.push(checkConflictsSummary(type, id, conflictsSummary, $selectedRows));
        });
        return $.when(...batchPromises);
    }

    // Process batches sequentially
    (function processNextBatch() {
        if (batches.length === 0) {
            // All batches processed
            var uniqueConflictIds = [...new Set(conflictsSummary.map(conflict => conflict.id))];
            var noConflictCount = totalChecked - uniqueConflictIds.length;
            showConflictSummaryModal(conflictsSummary, noConflictCount, uniqueConflictIds.length);
            return;
        }
        var batch = batches.shift();
        processBatch(batch).then(processNextBatch);
    })();
}


async function checkConflictsSummary(type, id, conflictsSummary, $selectedRows) {
    var row = $(`tr[data-id='${id}']`);
    var endpoint = type;

    var name = row.find("td:nth-child(3)").text().replace(/^"/, "").replace(/"$/, "").replace(/\s{2,}/g, " ").trim();
    var shortName = row.find("td:nth-child(4)").text().replace(/^"/, "").replace(/"$/, "").replace(/\s{2,}/g, " ").trim();
    var code = row.find("td:nth-child(5)").text().replace(/^"/, "").replace(/"$/, "").replace(/\s{2,}/g, " ").trim();

    var encodedName = encodeURIComponent(name);
    var encodedShortName = encodeURIComponent(shortName);
    var encodedCode = encodeURIComponent(code);

    var requests = [];
    var conflicts = { id, objectName: name };

    if (type !== "organisationUnits" && name) {
        requests.push(
            d2Get(`/api/${endpoint}.json?filter=name:eq:${encodedName}&filter=id:!eq:${id}&fields=id,name`).then(data => {
                if (data[endpoint] && data[endpoint].length > 0) {
                    conflicts["name"] = data[endpoint].map(item => ({ conflictingObjectId: item.id, property: "Name" }));
                }
            })
        );
    }

    if (type !== "organisationUnits" && shortName) {
        requests.push(
            d2Get(`/api/${endpoint}.json?filter=shortName:eq:${encodedShortName}&filter=id:!eq:${id}&fields=id,shortName`).then(data => {
                if (data[endpoint] && data[endpoint].length > 0) {
                    conflicts["shortName"] = data[endpoint].map(item => ({ conflictingObjectId: item.id, property: "Short Name" }));
                }
            })
        );
    }

    if (code) {
        requests.push(
            d2Get(`/api/${endpoint}.json?filter=code:eq:${encodedCode}&filter=id:!eq:${id}&fields=id,code`).then(data => {
                if (data[endpoint] && data[endpoint].length > 0) {
                    conflicts["code"] = data[endpoint].map(item => ({ conflictingObjectId: item.id, property: "Code" }));
                }
            })
        );
    }

    $selectedRows.each(function () {
        if ($(this).data("id") !== id) {
            var otherName = $(this).find("td:nth-child(3)").text().replace(/^"/, "").replace(/"$/, "").replace(/\s{2,}/g, " ").trim();
            var otherShortName = $(this).find("td:nth-child(4)").text().replace(/^"/, "").replace(/"$/, "").replace(/\s{2,}/g, " ").trim();
            var otherCode = $(this).find("td:nth-child(5)").text().replace(/^"/, "").replace(/"$/, "").replace(/\s{2,}/g, " ").trim();

            if (type !== "organisationUnits" && name && name === otherName) {
                conflicts["name"] = conflicts["name"] || [];
                conflicts["name"].push({ property: "Name", conflictingObjectId: $(this).data("id") });
            }
            if (type !== "organisationUnits" && shortName && shortName === otherShortName) {
                conflicts["shortName"] = conflicts["shortName"] || [];
                conflicts["shortName"].push({ property: "Short Name", conflictingObjectId: $(this).data("id") });
            }
            if (code && code === otherCode) {
                conflicts["code"] = conflicts["code"] || [];
                conflicts["code"].push({ property: "Code", conflictingObjectId: $(this).data("id") });
            }
        }
    });

    await Promise.all(requests);

    if (Object.keys(conflicts).length > 2) { // More than just `id` and `objectName`
        row.find(".status-cell").text("Conflict").addClass("status-conflict").removeClass("status-ready status-error");
        row.find(".row-checkbox").prop("checked", false);
        for (var field in conflicts) {
            if (field !== "id" && field !== "objectName") {
                conflicts[field].forEach(conflict => {
                    conflictsSummary.push({
                        objectName: conflicts.objectName,
                        id: conflicts.id,
                        property: conflict.property,
                        conflictingObjectId: conflict.conflictingObjectId
                    });
                });
            }
        }
    } else {
        row.find(".status-cell").text("Ready").addClass("status-ready").removeClass("status-conflict status-error");
        row.find(".fix-button").prop("disabled", false);
    }
    updateFixAllButton(type);
}


function updateFixButton(type) {
    var $rows = $(`#${type}-body tr`);
    $rows.each(function () {
        var $row = $(this);
        if ($row.find(".row-checkbox").is(":checked") && $row.find(".status-cell").text() === "Ready") {
            $row.find(".fix-button").prop("disabled", false);
        } else {
            $row.find(".fix-button").prop("disabled", true);
        }
    });
    updateFixAllButton(type);
}


function updateFixAllButton(type) {
    var allReady = true;
    var $rows = $(`#${type}-body tr`);
    $rows.each(function () {
        var $row = $(this);
        if ($row.find(".row-checkbox").is(":checked") && $row.find(".status-cell").text() !== "Ready") {
            allReady = false;
            return false;
        }
    });
    $(`#fix-all-${type}`).prop("disabled", !allReady);
}


function fixAll(type) {
    var $rows = $(`#${type}-body tr:has(.row-checkbox:checked)`);
    var totalFixed = 0;
    var totalFailed = 0;
    var importErrors = [];

    var requests = $rows.map(function () {
        if ($(this).find(".row-checkbox").is(":checked") && $(this).find(".status-cell").text() === "Ready") {
            var id = $(this).data("id");
            var name = $(this).find("td:nth-child(3)").text();
            return fixObjectSummary(type, id, name).then(function (success) {
                if (success) {
                    totalFixed++;
                } else {
                    totalFailed++;
                    importErrors.push({ name, id, message: "Failed to update" });
                }
            });
        }
    }).get();

    $.when(...requests).then(() => {
        var importResults = `${totalFixed} objects fixed, ${totalFailed} objects failed.`;
        showImportResultsModal(importResults, importErrors);
        checkRemainingRows(type);
    });
}


function checkRemainingRows(type) {
    var $rows = $(`#${type}-body tr`);
    if ($rows.length === 0) {
        var $tabButton = $(`.tabs a[href='#${type}-container']`).parent();
        var currentIndex = $tabButton.index();
        $tabButton.remove();
        $(`#${type}-container`).remove();

        var $tabs = $(".tabs .tab a");
        if ($tabs.length > 0) {
            var nextTab = $tabs.eq(Math.min(currentIndex, $tabs.length - 1));
            nextTab.addClass("active").trigger("click");
            var nextTabId = nextTab.attr("href").substring(1);
            $(`#${nextTabId}`).addClass("active");
            M.Tabs.getInstance($(".tabs")).select(nextTabId); // Ensure the content is rendered
        } else {
            $("#table-tabs").html("<div class=\"success-message\">Success!</div>");
        }
    }
}


async function fixObjectSummary(type, id, name) {
    var row = $(`tr[data-id='${id}']`);
    var endpoint = type;
    var importErrors = [];

    try {
        let data = await d2Get(`/api/${endpoint}/${id}?fields=:owner`);
        if (data.name) data.name = data.name.replace(/\s\s+/g, " ").trim();
        if (data.shortName) data.shortName = data.shortName.replace(/\s\s+/g, " ").trim();
        if (data.code) data.code = data.code.replace(/\s\s+/g, " ").trim();
        if (data.description) data.description = data.description.replace(/\s\s+/g, " ").trim();

        await d2PutJson(`/api/${endpoint}/${id}`, data);

        row.remove();
        return true;

    } catch (err) {
        row.find(".status-cell").text("Error").addClass("status-error").removeClass("status-ready status-conflict");
        row.find(".fix-button").prop("disabled", true);
        row.find(".row-checkbox").prop("checked", false);
        importErrors.push({ name, id, message: err.message });
        showImportResultsModal("Some objects failed to update.", importErrors);
        console.error("Update failed", err);
        return false;
    }
}


function selectAll(type, checkbox) {
    var $rows = $(`#${type}-body tr`);
    $rows.find(".row-checkbox").prop("checked", checkbox.checked);
    updateFixButton(type);
}


$(function () {
    fetchAndRenderMetadata();

    $(".modal-close").on("click", function () {
        var instance = M.Modal.getInstance($(this).closest(".modal")[0]);
        instance.close();
    });

    M.Modal.init($(".modal"), { dismissible: true });
    M.Tabs.init($(".tabs"));
    M.AutoInit(); // Initialize all Materialize elements
});


// Expose only necessary functions to the global scope
window.fetchAndRenderMetadata = fetchAndRenderMetadata;
window.checkConflicts = checkConflicts;
window.fixObject = fixObject;
window.checkAll = checkAll;
window.fixAll = fixAll;
window.selectAll = selectAll;
