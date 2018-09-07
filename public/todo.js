
// Holds the tasks
var tasks_toBeDone = [];
var tasks_completed = [];

// Holds the loading div, so we can show it and hide it.
var $loading = $('#loadingDiv');


/**
 * Displays a task at the end of the selected div container.
 * 
 * @param {string} taskName The task's item.
 * @param {string} container A jQuery string for a div container which the task should be added to.
 */
const displayTask = function (taskData, container='#todo-list') {
    // Construct HMTL for task.
    var taskHTML = '<li><span class="done">%</span>';
    taskHTML += '<span class="delete">x</span>';
    taskHTML += '<span class="edit">+</span>';
    taskHTML += '<span class="task"></span></li>';
    var $newTask = $(taskHTML); // Jquery wrapper
    $newTask.find('.task').text(taskData.item); // add task to the taskHTML
    $newTask.hide(); // hide immediately so we show with animation later.
    $(container).append($newTask); // Add task to tasks list.
    $newTask.show('clip',250).effect('highlight',1000); //Fade in task for effect on main screen.
}

/**
 * Displays an error dialog box. Show when Async calls fail.
 * 
 * @param {*} text The error message that will be displayed in the dialog box.
 * @param {*} showCloseButtons 
 *                  When true, displays a 'Okay' Button and the dialog has the ability to close when
 *                  clicking outside of it. When false, there are no buttons and the dialog does not
 *                  close when its clicked on the on the outside, forcing the user to refresh the page.
 */
const displayError = function (text, showCloseButtons=true)  {
    $('#error-dialog').children('p').text(text); // Sets the text

    // Displays the close button or not, and the ability to close by clicking outside/on escape.
    if(showCloseButtons) {
        // Dialog with close buttons and close on escape.
        $('#error-dialog').dialog({ 
            modal : true, 
            autoOpen: true, 
            buttons : {
                "Okay" : function () { $(this).dialog('close'); }
            }
        });
    } else {
        // Dialog with No buttons or close on escape.
        $('#error-dialog').dialog({ 
            modal : true, 
            autoOpen: true, 
            closeOnEscape: false,
            open: function(event, ui) {
                $(".ui-dialog-titlebar-close", ui.dialog | ui).hide(); // hides the little 'x' in the top-right corner.
            }
        });       
    }
}

/**
 * Executes an ajax call that retrieves all tasks.
 */
const getAllTasks = function() {
    $.get("/tasks", null, null, "json")
        .done(function(result, textStatus, jqXHR) {
            // Done function is called when the ajax call is sucessfully finished.

            //console.log(result);
            result.data.forEach(task => {
                if(task.completed) {
                    displayTask(task, '#completed-list');
                    tasks_completed.push(task);
                } else {
                    displayTask(task);
                    tasks_toBeDone.push(task);
                }
            }); 
        })
        .fail(function(jqXHR, textStatus, errorThrown) {
            // fail function is called when the ajax call is failed.

            // Display error from response data in a dialog box.
            let result = jqXHR.responseJSON;
            // The dialog box forces user to refresh page, as failure here indicates the website has some 
            // critical issues anyways (connectivity-related).
            displayError(result.error, false);
        });
}

/**
 *
 * Executes an ajax call that creates a new task.
 *
 * @param {*} taskItem The actual to-do statement the user would like to be reminded of.
 * @param {*} display To display the task on the UI.
 */
const createTask = function (taskItem, display=true) {
    $.post("/tasks", { item : taskItem },null, 'json')
        .done(function(result, textStatus, jqXHR) {
            // Done function is called when the ajax call is sucessfully finished.

            //console.log(result);
            //console.log(textStatus);

            // The createTask function only accepts 'item' in the request data. Hence, we do not have
            // to worry about the branches involved with 'completed' being true, as it can never occur
            // with the current code (as the default of 'completed' is false).
            /*var container;
            if(results.data.completed) {
                tasks_completed.push(result.data);
                container = "#completed-list";  
            } else {
                tasks_toBeDone.push(result.data); 
                container = "#todo-list"; 
            }*/
            // Adds the task data recieved from the response to the task's to be done list.
            tasks_toBeDone.push(result.data); 
            // Display the task in the UI if the user intended it be shown.
            if(display) { 
                displayTask(tasks_toBeDone[tasks_toBeDone.length-1]/*, container*/); 
            }
        })
        .fail(function(jqXHR, textStatus, errorThrown) {
            // fail function is called when the ajax call is failed.

            // Display error from response data in a dialog box.
            let result = jqXHR.responseJSON;
            displayError(result.error);
        });

}

/**
 * Executes an ajax call that updates a task specified by its id.
 * 
 * @param {*} id The unique identifer value assoicated with a task you would like to update. 
 * @param {*} taskParams a JSON object containing the fields you would like to update.
 * @param {*} done You can specify a callback when the ajax call is successful, usually to handle UI updates.
 * @param {*} fail You can specify a callback when the ajax call has failed, usually to handle UI updates.
 */
const updateTask = function (id, taskParams, done, fail) {
    // Validation checking for id.
    if(typeof id !== "number") { throw new TypeError("'id' must be a number."); }
    if(id < 0) { throw new TypeError("'id' must be above zero."); }

    $.ajax({
        method: "PUT",
        url: "/tasks/"+id,
        data: JSON.stringify(taskParams),
        dataType: "json",
        contentType: "application/json"})
        .done(function(result, status, jqXHR) {
            // Done function is called when the ajax call is sucessfully finished.

            // Finds the index of the current task with id is located (either in 'to be done' or 'completed'
            // task lists) and replaces it with the updated task data recieved from the server.
            let idx = tasks_toBeDone.findIndex(task => result.data.id == task.id);
            if(idx != -1) {
                tasks_toBeDone[idx] = result.data;
            } else {           
                let idx = tasks_completed.findIndex(task => result.data.id == task.id);
                tasks_completed[idx] = result.data;
            }

            if(done) { done(result, status, jqXHR); } // launch callback if one exists.
        })
        .fail(function(jqXHR,textStatus, errorThrown) {
            // fail function is called when the ajax call is failed.

            // Display error from response data in a dialog box.
            let result = jqXHR.responseJSON;
            displayError(result.error);
            if(fail) { fail(jqXHR, textStatus, errorThrown); } // launch callback if one exists
        });
}

/**
 * Executes an ajax call that updates a task specified by its id.
 * 
 * @param {*} id The unique identifer value assoicated with a task you would like to delete.
 * @param {*} done You can specify a callback when the ajax call is successful, usually to handle UI updates.
 * @param {*} fail You can specify a callback when the ajax call has failed, usually to handle UI updates.
 */
const deleteTask = function (id, done, fail) {
    // Validation checking for id.
    if(typeof id !== "number") { throw new TypeError("'id' must be a number."); }
    if(id < 0) { throw new TypeError("'id' must be above zero."); }

    $.ajax({
        method: "DELETE",
        url: "/tasks/"+id,
        dataType: "json",
        contentType: "application/json"})
        .done(function(result, status, jqXHR) {
            // Done function is called when the ajax call is sucessfully finished.

            // Finds the index of the current task with id is located (either in 'to be done'
            // or 'completed' task lists) and removes it from its assoicated task list.
            let idx = tasks_toBeDone.findIndex(task => id == task.id);
            if(idx != -1) {
                tasks_toBeDone.splice(idx, 1)
            } else {           
                let idx = tasks_completed.findIndex(task => id == task.id);
                tasks_completed.splice(idx, 1)
            }
            if(done) { done(result, status, jqXHR); } // launch callback if one exists.
        })
        .fail(function(jqXHR,textStatus, errorThrown) {
            // fail function is called when the ajax call is failed.

            // Display error from response data in a dialog box.
            let result = jqXHR.responseJSON;
            displayError(result.error);
            if(fail) { fail(jqXHR, textStatus, errorThrown); } // launch callback if one exists.
        });
}

$(document)
  // On every ajax call that starts, a loading screen should appear.
  .ajaxStart(function () {
    $loading.show();
  })
  // When any ajax call ends (sucessfully or unsucessfully), the loading screen should disappear.
  .ajaxStop(function () {
    $loading.hide();
  })
  .ready(function (e) {
    // The loading screen displays as soon as the webpage is ready despite not being
    //  needed, as no ajax call is executed yet, so hide it immediately.  
    $loading = $('#loadingDiv'); // Reload loadingDiv jQuery variable because it is loaded properly now.
    $loading.hide();  

    // As soon as the document is ready, retrieve the list of tasks.
    getAllTasks();

    // Add Todo Button
    $('#add-todo').button({
        icons: {
            primary: "ui-icon-circle-plus" 
        } 
    }).click(function() {
        $('#new-todo').dialog('open');
    });

    // New Todo Item Dialog
    $('#new-todo').dialog({ 
        modal : true, 
        autoOpen: false, 
        buttons : {
            "Add task" : function () {
                // Check if the task is emtpy or not.
                var taskName = $('#task').val();
                if (taskName === "") { 
                    return false; 
                }
                // Attempt to create a task on the server, and display it on UI.
                createTask(taskName);
                // Regardless if the task was created or not, Close the new todo dialog, 
                //clear modal input as well.
                $('#task').val('');
                $(this).dialog('close');
            },
            "Cancel" : function () { $(this).dialog('close'); }
        }
    });

    // Delete task confirm dialog box
    $('#delete-confirm-todo').dialog({ 
        modal : true, 
        autoOpen: false, 
        buttons : {
            "Confirm" : function () {
                let $this = $(this); // create this object for nested functions later
                $this.dialog('close'); // close dialog

                // get the task from the correct group, so we can retrieve its id
                let task = $this.data('group') === "todo-list" ? tasks_toBeDone[$this.data('index')] :tasks_completed[$this.data('index')];

                // Perform an ajax call that deletes the specific task selected from server and locally.
                deleteTask(task.id,
                    function(result, status, jqXHR) { // Success
                        $this.data('li').effect('puff', function() { 
                            $this.remove(); 
                        });
                    },
                    function(jqXHR, textStatus, errorThrown) { //Failed
                        $this.dialog('close');
                    }
                );
            },
            "Cancel" : function () { $(this).dialog('close'); }
        }
    });

    // Edit task dialog box
    $('#edit-todo').dialog({ 
        modal : true, 
        autoOpen: false, 
        buttons : {
            "Confirm" : function () {
                // Check if the task is emtpy or not.
                var taskName = $('#task2').val();
                console.log("taskName: ", taskName);
                if (taskName === "") { 
                    return false; 
                }

                $('#edit-confirm-todo')
                    .data('li', $(this).data('li')) // The <li> object of the todo task.
                    .data('group', $(this).data('group')) // the parent's div container ID (so we know if its a completed task or not).
                    .data('index', $(this).data('index')) // The position within the html list. (so we know which position it was in the array).
                    .data('editModal', $(this)) // the edit modal itself.
                    .dialog('open');

            },
            "Cancel" : function () { $(this).dialog('close'); }
        }
    });

    // Edit task confirm dialog box
    $('#edit-confirm-todo').dialog({ 
        modal : true, 
        autoOpen: false, 
        buttons : {
            "Confirm" : function () {
                let $this = $(this);

                var $taskItem = $this.data('li');
                var $editModal = $this.data('editModal');
                var $editModal_task = $editModal.find('#task2');

                // get the task from the correct group, so we can retrieve its id
                let task = $this.data('group') === "todo-list" ? tasks_toBeDone[$this.data('index')] : tasks_completed[$this.data('index')];

                // Perform an ajax call that updates the specific task selected from server and locally.
                updateTask(task.id, 
                    { item : $editModal_task.val()}, // the request data is of the update item text.
                    function (result, status, jqXHR) { // Success
                        // Update local data at the specific index within a specific task list.
                        if($this.data('group') === "todo-list") {
                            tasks_toBeDone[$this.data('index')] = result.data;
                        } else {
                            tasks_completed[$this.data('index')] = result.data;
                        }

                        // Update UI, Close dialogs once updated, clear modal input as well.
                        $taskItem.find('.task').text($editModal_task.val());
                        $taskItem.show('clip',250).effect('highlight',1000);
                        $editModal_task.val('');
                        $this.dialog('close');
                        $editModal.dialog('close');
                    },
                    function(jqXHR, textStatus, errorThrown) { //Failed
                        // only close the edit confirmation dialog, not the edit dialog, just incase the user may want to try again.
                        $this.dialog('close'); 
                    });

            },
            "Cancel" : function () { $(this).dialog('close'); }
        }
    });

    // Click event when DONE button is clicked with tasks in current('To Be done') tasks.
    $('#todo-list').on('click', '.done', function() {
        var $taskItem = $(this).parent('li');
        var taskItemIndex = $taskItem.index();

        // Perform an ajax call that updates the specific task selected from server and locally.
        updateTask(tasks_toBeDone[taskItemIndex].id, 
            { completed : true }, // the request data is of the completed field being true.
            function (result, status, jqXHR) { // Success
                // Update local data at the specific index within a specific task list.
                tasks_toBeDone[taskItemIndex].completed = true;
                tasks_completed.unshift(tasks_toBeDone[taskItemIndex]);
                tasks_toBeDone.splice(taskItemIndex, 1);

                // Update UI
                $taskItem.slideUp(250, function() {
                    var $this = $(this);
                    $this.detach();
        
                    // add to completed list
                    $('#completed-list').prepend($this);
                    $this.slideDown();
                });
            },
            function(jqXHR, textStatus, errorThrown) { //Failed
                // Do nothing here, the updateTask will show a error dialog anyways.
            }
        )
    });

    // Click event when EDIT button is clicked with tasks in current('To Be done') tasks.
    $('#todo-list').on('click', '.edit', function() {
        var $taskItem = $(this).parent('li');
        var taskItemText = $taskItem.find('.task').text();
        $('#edit-todo #task2').val(taskItemText);

        $('#edit-todo')
            .data('li', $(this).parent('li')) // The <li> object of the todo task.
            .data('group', $(this).parent('li').parent().attr('id')) // the parent's div container ID (so we know if its a completed task or not).
            .data('index', $(this).parent('li').index()) // The position within the html list. (so we know which position it was in the array).
            .dialog('open');
    });


    // Variables to helps with the movement and positioning of tasks before they moved.
    var sortable_selectedIndex;
    var sortable_selectedGroup;

    // Sort lists and dragable enabled
    $('.sortlist').sortable({
        connectWith : '.sortlist',
        cursor : 'pointer',
        placeholder : 'ui-state-highlight',
        cancel : '.delete,.done',
        start : function(event, ui) {
            // This is called, when we are beginning to drag a task.
            //console.log('start: ', event, ui);

            // Store the current position and group (to be done/completed) so we know where 
            // how and where to retrieve it in the local data arrays.
            sortable_selectedIndex = $(ui.item[0]).index();
            sortable_selectedGroup = $(ui.item[0]).parent().attr('id');
        },
        stop : function(event, ui) {
            // This is called, when we are end the dragging a task (ie. dropped the task).

            // Store the new position and group (to be done/completed) so we know where 
            // the task should be moved to in the local data arrays, as at this point, it
            // is still in the old position, only UI has been updated.
            let newIndex = $(ui.item[0]).index();
            let newGroup = $(ui.item[0]).parent().attr('id');

            // Determine whether the task was moved in the same group or not.
            if(newGroup === sortable_selectedGroup) {
                // Same group requires reorganising local data, as only the visual positioning has changed.

                // Determine the group, remove the task from its old 
                // position and place it at its new position in the same data array.
                if(newGroup === "todo-list") {
                    let task = tasks_toBeDone[sortable_selectedIndex];
                    tasks_toBeDone.splice(sortable_selectedIndex, 1);
                    tasks_toBeDone.splice(newIndex, 0, task);
                } else {
                    let task = tasks_completed[sortable_selectedIndex];
                    tasks_completed.splice(sortable_selectedIndex, 1);
                    tasks_completed.splice(newIndex, 0, task);
                }
            } else {
                // A task has been moved to a different group means updating on server and local data, but only if async call is successful.

                // Determine the new group so we can take the appropriate actions.
                if(newGroup === "todo-list") {

                    let task = tasks_completed[sortable_selectedIndex];
                    updateTask(task.id, 
                        { completed : false },
                        function (result, status, jqXHR) { // Success
                            task.completed = false; // Update the task's local data.
                            // Remove the task from the old group's task list.
                            tasks_completed.splice(sortable_selectedIndex, 1);
                            // Add the task at the new position within the new group's data array.
                            tasks_toBeDone.splice(newIndex, 0, task);
                        },
                        function(jqXHR, textStatus, errorThrown) { //Failed
                            // Return task to original position on UI on failure.
                            $('.sortlist').sortable('cancel');
                        }
                    );
                } else {
                    let task = tasks_toBeDone[sortable_selectedIndex];
                    updateTask(task.id, 
                        { completed : true },
                        function (result, status, jqXHR) { // Success
                            task.completed = true; // Update the task's local data.
                            // Remove the task from the old group's task list.
                            tasks_toBeDone.splice(sortable_selectedIndex, 1);
                            // Add the task at the new position within the new group's data array.
                            tasks_completed.splice(newIndex, 0, task);
                        },
                        function(jqXHR, textStatus, errorThrown) { //Failed
                            // Return task to original position on UI on failure.
                            $('.sortlist').sortable('cancel');
                        }
                    );

                }
            }
        }
    });

    // Click event when delete button is clicked within any task.
    $('.sortlist').on('click','.delete',function() {
        $('#delete-confirm-todo')
            .data('li', $(this).parent('li')) // The <li> object of the todo task.
            .data('group', $(this).parent('li').parent().attr('id')) // the parent's div container ID (so we know if its a completed task or not).
            .data('index', $(this).parent('li').index()) // The position within the list. (so we know which position it was in the array).
            .dialog('open');
    });
}); // end ready