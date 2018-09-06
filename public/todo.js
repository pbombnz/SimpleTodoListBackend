var tasks_toBeDone = [];
var tasks_completed = [];

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

const displayError = function (text, showCloseButtons=true)  {
    $('#error-dialog').children('p').text(text);
    if(showCloseButtons) {
        $('#error-dialog').dialog({ 
            modal : true, 
            autoOpen: true, 
            buttons : {
                "Okay" : function () { $(this).dialog('close'); }
            }
        });
    } else {
        $('#error-dialog').dialog({ 
            modal : true, 
            autoOpen: true, 
            closeOnEscape: false,
            open: function(event, ui) {
                $(".ui-dialog-titlebar-close", ui.dialog | ui).hide();
            }
        });       
    }
}

const getAllTasks = function() {
    $.get("/tasks", null, null, "json")
        .done(function(result, textStatus, jqXHR) {
            console.log(result);
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
            // Display error (force user to refresh page)
            let result = jqXHR.responseJSON;
            displayError(result.error, false);
        });
}

const createTask = function (taskItem, display=true) {
    $.post("/tasks", { item : taskItem },null, 'json')
        .done(function(result, textStatus, jqXHR) {
            console.log(result);
            console.log(textStatus);

            tasks_toBeDone.push(result.data);
            if(display) { 
                displayTask(tasks_toBeDone[tasks_toBeDone.length-1]); 
            }
        })
        .fail(function(jqXHR, textStatus, errorThrown) {
            // Display error
            let result = jqXHR.responseJSON;
            displayError(result.error);
        });

}


const updateTask = function (id, taskParams, done, fail) {
    if(typeof id !== "number") { throw new TypeError("'id' must be a number."); }
    if(id < 0) { throw new TypeError("'id' must be above zero."); }
    $.ajax({
        method: "PUT",
        url: "/tasks/"+id,
        data: JSON.stringify(taskParams),
        dataType: "json",
        contentType: "application/json"})
        .done(function(result, status, jqXHR) {
            let idx = tasks_toBeDone.findIndex(task => result.data.id == task.id);
            if(idx != -1) {
                tasks_toBeDone[idx] = result.data;
            } else {           
                let idx = tasks_completed.findIndex(task => result.data.id == task.id);
                tasks_completed[idx] = result.data;
            }
            if(done) { done(result, status, jqXHR); }
        })
        .fail(function(jqXHR,textStatus, errorThrown) {
            // Display error
            let result = jqXHR.responseJSON;
            displayError(result.error);
            if(fail) { fail(jqXHR, textStatus, errorThrown); }
        });
}

const deleteTask = function (id, done, fail) {
    if(typeof id !== "number") { throw new TypeError("'id' must be a number."); }
    if(id < 0) { throw new TypeError("'id' must be above zero."); }

    $.ajax({
        method: "DELETE",
        url: "/tasks/"+id,
        dataType: "json",
        contentType: "application/json"})
        .done(function(result, status, jqXHR) {
            let idx = tasks_toBeDone.findIndex(task => id == task.id);
            if(idx != -1) {
                tasks_toBeDone.splice(idx, 1)
            } else {           
                let idx = tasks_completed.findIndex(task => id == task.id);
                tasks_completed.splice(idx, 1)
            }
            if(done) { done(result, status, jqXHR); }
        })
        .fail(function(jqXHR,textStatus, errorThrown) {
            // Display error
            let result = jqXHR.responseJSON;
            displayError(result.error);
            if(fail) { fail(jqXHR, textStatus, errorThrown); }
        });
}

$(document).ajaxStart(function () {
    $loading.show();
  })
  .ajaxStop(function () {
    $loading.hide();
  })
  .ready(function (e) {
    $loading = $('#loadingDiv');
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
                createTask(taskName);
                // Close dialog once added, clear modal input as well.
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

                // async call - delete task from server and from global variable.
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
                    .data('li', $(this).data('li'))
                    .data('group', $(this).data('group'))
                    .data('index', $(this).data('index'))
                    .data('editModal', $(this))
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

                updateTask(task.id, 
                    { item : $editModal_task.val()}, 
                    function (result, status, jqXHR) { // Success
                        // Update local data
                        if($this.data('group') === "todo-list") {
                            tasks_toBeDone[$this.data('index')] = result.data;
                        } else {
                            tasks_completed[$this.data('index')] = result.data;
                        }

                        // Update UI, Close dialog once added, clear modal input as well.
                        $taskItem.find('.task').text($editModal_task.val());
                        $taskItem.show('clip',250).effect('highlight',1000);
                        $editModal_task.val('');
                        $this.dialog('close');
                        $editModal.dialog('close');
                    },
                    function(jqXHR, textStatus, errorThrown) { //Failed
                        $this.dialog('close');
                    });

            },
            "Cancel" : function () { $(this).dialog('close'); }
        }
    });

    // Click event when done button is clicked with tasks in current('To Be done') tasks.
    $('#todo-list').on('click', '.done', function() {
        var $taskItem = $(this).parent('li');
        var taskItemIndex = $taskItem.index();

        updateTask(tasks_toBeDone[taskItemIndex].id, 
            { completed : true }, 
            function (result, status, jqXHR) { // Success
                // Update Local data
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
            }
        )
    });

    // Click event when edit button is clicked with tasks in current('To Be done') tasks.
    $('#todo-list').on('click', '.edit', function() {
        var $taskItem = $(this).parent('li');
        var taskItemText = $taskItem.find('.task').text();
        $('#edit-todo #task2').val(taskItemText);

        $('#edit-todo')
            .data('li', $(this).parent('li'))
            .data('group', $(this).parent('li').parent().attr('id'))
            .data('index', $(this).parent('li').index())
            .dialog('open');
    });

    // Sort lists and dragable enabled
    var sortable_selectedIndex;
    var sortable_selectedGroup;
    $('.sortlist').sortable({
        connectWith : '.sortlist',
        cursor : 'pointer',
        placeholder : 'ui-state-highlight',
        cancel : '.delete,.done',
        start : function(event, ui) {
            //console.log('start: ', event, ui);

            sortable_selectedIndex = $(ui.item[0]).index();
            sortable_selectedGroup = $(ui.item[0]).parent().attr('id');
            //console.log(index);
        },
        stop : function(event, ui) {
            let newIndex = $(ui.item[0]).index();
            console.log('newIndex: ', newIndex);
            let newGroup = $(ui.item[0]).parent().attr('id');

            if(newGroup === sortable_selectedGroup) {
                // Same group requires reorganising local data only. 
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
                // Moving list item to a different group means updating on server and local data, but only if async call is successful.
                if(newGroup === "todo-list") {
                    let task = tasks_completed[sortable_selectedIndex];
                    updateTask(task.id, 
                        { completed : false },
                        function (result, status, jqXHR) { // Success
                            task.completed = false;
                            tasks_completed.splice(sortable_selectedIndex, 1);
                            tasks_toBeDone.splice(newIndex, 0, task);
                        },
                        function(jqXHR, textStatus, errorThrown) { //Failed
                            // Return task to original position on UI
                            $('.sortlist').sortable('cancel')
                        }
                    );
                } else {
                    let task = tasks_toBeDone[sortable_selectedIndex];
                    updateTask(task.id, 
                        { completed : true },
                        function (result, status, jqXHR) { // Success
                            task.completed = true;
                            tasks_toBeDone.splice(sortable_selectedIndex, 1);
                            tasks_completed.splice(newIndex, 0, task);
                        },
                        function(jqXHR, textStatus, errorThrown) { //Failed
                            // Return task to original position on UI
                            $('.sortlist').sortable('cancel')
                        }
                    );

                }
            }

            //console.log('update: ', event, ui);
        }
    });

    // Click event when delete button is clicked within any task.
    $('.sortlist').on('click','.delete',function() {
        $('#delete-confirm-todo')
            .data('li', $(this).parent('li'))
            .data('group', $(this).parent('li').parent().attr('id'))
            .data('index', $(this).parent('li').index())
            .dialog('open');
    });
}); // end ready