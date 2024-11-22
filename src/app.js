"use strict";

//JS
import $ from "jquery"; //eslint-disable-line

//CSS
import "./css/style.css";


// Function to highlight leading, trailing, and double spaces
function highlightSpaces(string) {
    if (string) {
        return string.replace(/(^\s+)|(\s+$)|(\s\s+)/g, "<span class=\"highlight\">$&</span>");
    }
    return string;
}
    
function quoteString(string) {
    return string ? `"${string}"` : "";
}
    
function fetchAndRenderMetadata() {
    $("#loading-indicator").show(); // Show loading indicator
    
    var requests = [];
    var types = ["name", "code", "description"];
    
    types.forEach(function (type) {
        requests.push(
            $.getJSON(`../../metadata.json?filter=${type}:ilike:%20%20&fields=id,name,shortName,code,description`),
            $.getJSON(`../../metadata.json?filter=${type}:$ilike:%20&fields=id,name,shortName,code,description`),
            $.getJSON(`../../metadata.json?filter=${type}:ilike$:%20&fields=id,name,shortName,code,description`)
        );
    });
    
    $.when(...requests).then(function(...responses) {
        $("#loading-indicator").hide(); // Hide loading indicator
    
        var mergedData = {};
        responses.forEach(function(response) {
            var data = response[0];
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
    });
}
    
function renderTables(data) {
    $("#table-tabs").empty();
    for (var type in data) {
        var objects = data[type];
        var $table = $("<table>").append(
            $("<thead>").append(
                `<tr>
                        <th>Select <input type="checkbox" onclick="selectAll('${type}', this)"></th>
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
                `<td><input type="checkbox" class="row-checkbox" onclick="updateFixButton('${type}')"></td>
                    <td>${obj.id}</td>
                    <td>${name}</td>
                    <td>${shortName}</td>
                    <td>${code}</td>
                    <td>${description}</td>
                    <td>
                        <button class="styled-button" class="check-button" onclick="checkConflicts('${type}', '${obj.id}')">Check</button>
                        <button class="styled-button fix-button" onclick="fixObject('${type}', '${obj.id}')" disabled>Fix</button>
                    </td>
                    <td class="status-cell"></td>`
            );
            $table.find("tbody").append(row);
        });
    
        var $container = $("<div>", { class: "table-container", id: `${type}-container` }).append(
            `<h2>${type.charAt(0).toUpperCase() + type.slice(1)}</h2>`,
            $table,
            `<button class="styled-button"  onclick="checkAll('${type}')">Check Selected</button>
                 <button class="styled-button"  id="fix-all-${type}" class="fix-button" onclick="fixAll('${type}')" disabled>Fix Selected</button>`
        );
    
        $("#table-tabs").append($container);
    }
}
    
function createTabs(types) {
    var $tabs = $("<div class=\"tabs\">");
    types.forEach(function (type, idx) {
        var $button = $(`<button class="${idx === 0 ? "active" : ""}" onclick="openTab('${type}')">${type.charAt(0).toUpperCase() + type.slice(1)}</button>`);
        $tabs.append($button);
        if (idx === 0) {
            $(`#${type}-container`).addClass("active");
        }
    });
    $("#table-tabs").before($tabs);
}
    
function openTab(type) {
    $(".tabs button").removeClass("active");
    $(`.tabs button:contains(${type.charAt(0).toUpperCase() + type.slice(1)})`).addClass("active");
    $(".table-container").removeClass("active");
    $(`#${type}-container`).addClass("active");
}
    
function checkConflicts(type, id) {
    var row = $(`tr[data-id='${id}']`);
    var endpoint = type;
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
    
    var requests = [];
    var conflicts = {};
    
    if (name) {
        requests.push(
            $.getJSON(`../../${endpoint}.json?filter=name:eq:${name}&filter=id:!eq:${id}&fields=id,name`, function(data) {
                if (data[endpoint] && data[endpoint].length > 0) conflicts["name"] = data[endpoint];
            })
        );
    }
    if (shortName) {
        requests.push(
            $.getJSON(`../../${endpoint}.json?filter=shortName:eq:${shortName}&filter=id:!eq:${id}&fields=id,shortName`, function(data) {
                if (data[endpoint] && data[endpoint].length > 0) conflicts["shortName"] = data[endpoint];
            })
        );
    }
    if (code) {
        requests.push(
            $.getJSON(`../../${endpoint}.json?filter=code:eq:${code}&filter=id:!eq:${id}&fields=id,code`, function(data) {
                if (data[endpoint] && data[endpoint].length > 0) conflicts["code"] = data[endpoint];
            })
        );
    }
    
    $.when(...requests).then(() => {
        if (Object.keys(conflicts).length > 0) {
            row.find(".status-cell").text("Conflict").addClass("status-conflict").removeClass("status-ready status-error");
            row.find(".row-checkbox").prop("checked", false);
            alert("Conflicts found: " + JSON.stringify(conflicts, null, 2));
        } else {
            row.find(".status-cell").text("Ready").addClass("status-ready").removeClass("status-conflict status-error");
            row.find(".fix-button").prop("disabled", false);
            row.find(".row-checkbox").prop("checked", true);
        }
        updateFixAllButton(type);
    });
}
    
function fixObject(type, id) {
    var row = $(`tr[data-id='${id}']`);
    var endpoint = type;
    
    $.getJSON(`../../${endpoint}/${id}?fields=:owner`, function(data) {
        if (data.name) data.name = data.name.replace(/\s\s+/g, " ").trim();
        if (data.shortName) data.shortName = data.shortName.replace(/\s\s+/g, " ").trim();
        if (data.code) data.code = data.code.replace(/\s\s+/g, " ").trim();
        if (data.description) data.description = data.description.replace(/\s\s+/g, " ").trim();
    
        $.ajax({
            url: `../../${endpoint}/${id}`,
            method: "PUT",
            contentType: "application/json",
            data: JSON.stringify(data),
            success: function() {
                row.remove();
                updateFixAllButton(type);
                checkRemainingRows(type);
            },
            error: function() {
                row.find(".status-cell").text("Error").addClass("status-error").removeClass("status-ready status-conflict");
                row.find(".fix-button").prop("disabled", true);
                row.find(".row-checkbox").prop("checked", false);
                alert("Update failed");
            }
        });
    });
}
    
function showModal(conflictsSummary, noConflictCount) {
    var $modal = $("#conflict-summary-modal");
    var $tableBody = $("#conflict-summary-table tbody");
    var $summaryLine = $("#conflict-summary-table-summary");
    
    $tableBody.empty(); // Clear the table body
    
    conflictsSummary.forEach(function (conflict) {
        var row = `<tr>
                <td>${conflict.objectName}</td>
                <td>${conflict.id}</td>
                <td>${conflict.property}</td>
                <td>${conflict.conflictingObjectId}</td>
            </tr>`;
        $tableBody.append(row);
    });
    
    $summaryLine.text(`${noConflictCount} rows did not have any conflicts.`);
    
    $modal.show();
    
    // Scroll to top of the page
    document.getElementById("conflict-summary-modal").scrollIntoView();
}
    
function closeModal() {
    $("#conflict-summary-modal").hide();
}
    
function closeHelpModal() {
    $("#help-modal").removeClass("open");
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
            var noConflictCount = totalChecked - conflictsSummary.length;
            showModal(conflictsSummary, noConflictCount);
            return;
        }
        var batch = batches.shift();
        processBatch(batch).then(processNextBatch);
    })();
}
    
function checkConflictsSummary(type, id, conflictsSummary, $selectedRows) {
    var row = $(`tr[data-id='${id}']`);
    var endpoint = type;
    
    /* eslint-disable no-useless-escape */
    var name = row.find("td:nth-child(3)").text()
        .replace(/^"/, "") // Remove leading quote
        .replace(/"$/, "") // Remove trailing quote
        .replace(/\s{2,}/g, " ") // Replace double space with single space
        .trim(); // Remove leading and trailing spaces
    
    var shortName = row.find("td:nth-child(4)").text()
        .replace(/^"/, "") // Remove leading quote
        .replace(/"$/, "") // Remove trailing quote
        .replace(/\s{2,}/g, " ") // Replace double space with single space
        .trim(); // Remove leading and trailing spaces
    
    var code = row.find("td:nth-child(5)").text()
        .replace(/^"/, "") // Remove leading quote
        .replace(/"$/, "") // Remove trailing quote
        .replace(/\s{2,}/g, " ") // Replace double space with single space
        .trim(); // Remove leading and trailing spaces
    /* eslint-enable no-useless-escape */
    
        // Encode field values to sanitize them
    var encodedName = encodeURIComponent(name);
    var encodedShortName = encodeURIComponent(shortName);
    var encodedCode = encodeURIComponent(code);
    
    var requests = [];
    var conflicts = { id, objectName: name };
    
    if (type !== "organisationUnits" && name) {
        requests.push(
            $.getJSON(`../../${endpoint}.json?filter=name:eq:${encodedName}&filter=id:!eq:${id}&fields=id,name`, function (data) {
                if (data[endpoint] && data[endpoint].length > 0) {
                    conflicts["name"] = data[endpoint].map(item => ({ conflictingObjectId: item.id, property: "Name" }));
                }
            })
        );
    }
    if (type !== "organisationUnits" && shortName) {
        requests.push(
            $.getJSON(`../../${endpoint}.json?filter=shortName:eq:${encodedShortName}&filter=id:!eq:${id}&fields=id,shortName`, function (data) {
                if (data[endpoint] && data[endpoint].length > 0) {
                    conflicts["shortName"] = data[endpoint].map(item => ({ conflictingObjectId: item.id, property: "Short Name" }));
                }
            })
        );
    }
    if (code) {
        requests.push(
            $.getJSON(`../../${endpoint}.json?filter=code:eq:${encodedCode}&filter=id:!eq:${id}&fields=id,code`, function (data) {
                if (data[endpoint] && data[endpoint].length > 0) {
                    conflicts["code"] = data[endpoint].map(item => ({ conflictingObjectId: item.id, property: "Code" }));
                }
            })
        );
    }
    
    $selectedRows.each(function () {
        if ($(this).data("id") !== id) {
            var otherName = $(this).find("td:nth-child(3)").text()
                .replace(/^"/, "")
                .replace(/"$/, "")
                .replace(/\s{2,}/g, " ")
                .trim();
            var otherShortName = $(this).find("td:nth-child(4)").text()
                .replace(/^"/, "")
                .replace(/"$/, "")
                .replace(/\s{2,}/g, " ")
                .trim();
            var otherCode = $(this).find("td:nth-child(5)").text()
                .replace(/^"/, "")
                .replace(/"$/, "")
                .replace(/\s{2,}/g, " ")
                .trim();

    
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
    
    return $.when(...requests).then(() => {
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
    });
}
    
function updateFixButton(type) {
    var $rows = $(`#${type}-body tr`);
    $rows.each(function() {
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
    $rows.each(function() {
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
    
    var requests = $rows.map(function() {
        if ($(this).find(".row-checkbox").is(":checked") && $(this).find(".status-cell").text() === "Ready") {
            var id = $(this).data("id");
            return fixObjectSummary(type, id).then(function(success) {
                if (success) {
                    totalFixed++;
                } else {
                    totalFailed++;
                }
            });
        }
    }).get();
    
    $.when(...requests).then(() => {
        alert(`Batch fix completed: ${totalFixed} objects fixed, ${totalFailed} objects failed.`);
        checkRemainingRows(type);
    });
}
    
function checkRemainingRows(type) {
    var $rows = $(`#${type}-body tr`);
    if ($rows.length === 0) {
        var $tabButton = $(`.tabs button:contains(${type.charAt(0).toUpperCase() + type.slice(1)})`);
        var currentIndex = $tabButton.index();
        $tabButton.remove();
        $(`#${type}-container`).remove();
    
        var $tabs = $(".tabs button");
        if ($tabs.length > 0) {
            $tabs.eq(Math.max(currentIndex - 1, 0)).addClass("active").trigger("click");
        } else {
            $("#table-tabs").html("<div class=\"success-message\">Success!</div>");
        }
    }
}
    
function fixObjectSummary(type, id) {
    var row = $(`tr[data-id='${id}']`);
    var endpoint = type;
    
    return $.getJSON(`../../${endpoint}/${id}?fields=:owner`, function(data) {
        if (data.name) data.name = data.name.replace(/\s\s+/g, " ").trim();
        if (data.shortName) data.shortName = data.shortName.replace(/\s\s+/g, " ").trim();
        if (data.code) data.code = data.code.replace(/\s\s+/g, " ").trim();
        if (data.description) data.description = data.description.replace(/\s\s+/g, " ").trim();
    
        return $.ajax({
            url: `../../${endpoint}/${id}`,
            method: "PUT",
            contentType: "application/json",
            data: JSON.stringify(data),
            success: function() {
                row.remove();
                return true;
            },
            error: function() {
                row.find(".status-cell").text("Error").addClass("status-error").removeClass("status-ready status-conflict");
                row.find(".fix-button").prop("disabled", true);
                row.find(".row-checkbox").prop("checked", false);
                return false;
            }
        });
    });
}
    
function selectAll(type, checkbox) {
    var $rows = $(`#${type}-body tr`);
    $rows.find(".row-checkbox").prop("checked", checkbox.checked);
    updateFixButton(type);
}


$(document).ready(function () {
    fetchAndRenderMetadata();

    $("#help-button").click(function() {
        $("#help-modal").addClass("open");
    });

    $(".close-button").click(function() {
        closeHelpModal();
    });
});

// Expose functions to the global scope
window.highlightSpaces = highlightSpaces;
window.quoteString = quoteString;
window.fetchAndRenderMetadata = fetchAndRenderMetadata;
window.renderTables = renderTables;
window.createTabs = createTabs;
window.openTab = openTab;
window.checkConflicts = checkConflicts;
window.fixObject = fixObject;
window.showModal = showModal;
window.closeModal = closeModal;
window.closeHelpModal = closeHelpModal;
window.checkAll = checkAll;
window.checkConflictsSummary = checkConflictsSummary;
window.updateFixButton = updateFixButton;
window.updateFixAllButton = updateFixAllButton;
window.fixAll = fixAll;
window.checkRemainingRows = checkRemainingRows;
window.fixObjectSummary = fixObjectSummary;
window.selectAll = selectAll;