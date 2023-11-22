document.addEventListener('DOMContentLoaded', function () {
    // Function to mark a task as completed
    async function markTaskAsCompleted(taskId, link) {
        try {
            const response = await fetch(`/complete_task/${taskId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status: 'completada' }),
            });

            if (response.ok) {
                const data = await response.json();

                if (data.success) {
                    const taskElement = document.getElementById('task-' + taskId);
                    const completedTasksList = document.querySelector('.completed-tasks-list');
                    const taskInCompletedList = completedTasksList.querySelector(`#task-${taskId}`);

                    if (!taskInCompletedList) {
                        const taskDescription = taskElement.querySelector('.task-description');
                        const taskStatus = taskElement.querySelector('.status'); // Assuming a class for the status

                        taskDescription.classList.add('completed-task');
                        taskStatus.innerHTML = 'Estado: Completada'; // Update the status

                        link.style.display = 'none';
                        completedTasksList.appendChild(taskElement);
                    }

                    showMessage(data.message, true);
                } else {
                    console.error('Failed to mark task as completed.');
                    showMessage(data.message, false);
                }
            } else {
                console.error('Error during request. Status:', response.status);
                showMessage('Error during request.', false);
            }
        } catch (error) {
            console.error('Network error during request:', error);
            showMessage('Network error during request.', false);
        }
    }

    // Al cargar la página
    const taskIds = Array.from(document.querySelectorAll('.add-comment-form')).map(form => form.getAttribute('data-task-id'));

    for (const taskId of taskIds) {
        // No es necesario cargar comentarios aquí, ya que se realizará después de agregar un comentario
        // await loadComments(taskId);
    }

    // Al agregar un comentario
    async function addComment(taskId) {
        try {
            const commentText = document.getElementById('comment_text-' + taskId).value;

            const url = `/add_comment/${taskId}`;

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ comment_text: commentText }),
            });

            if (response.ok) {
                const data = await response.json();

                if (data.success) {
                    // Actualiza la interfaz con los comentarios del servidor
                    await loadComments(taskId);
                    showMessage(data.message, true);

                    // Almacena los comentarios en LocalStorage
                    localStorage.setItem(`comments-${taskId}`, JSON.stringify(data.comments));
                } else {
                    showMessage('Error al agregar el comentario. Por favor, inténtalo de nuevo.', false);
                }
            } else {
                showMessage(`Error durante la solicitud. Estado: ${response.status}`, false);
            }
        } catch (error) {
            showMessage('Error durante la solicitud. Por favor, inténtalo de nuevo.', false);
        }
    }

    // Función para cargar y actualizar comentarios
    async function loadComments(taskId) {
        try {
            const storedComments = localStorage.getItem(`comments-${taskId}`);

            if (storedComments) {
                const comments = JSON.parse(storedComments);
                updateComments(taskId, comments);
            }

            const url = `/get_comments/${taskId}`;
            const response = await fetch(url);

            if (response.ok) {
                const data = await response.json();
                const comments = data.comments;

                // Actualiza los comentarios solo si son diferentes a los almacenados
                if (JSON.stringify(comments) !== storedComments) {
                    updateComments(taskId, comments);
                    // Actualiza LocalStorage con los nuevos comentarios
                    localStorage.setItem(`comments-${taskId}`, JSON.stringify(comments));
                }
            } else {
                showMessage(`Error durante la solicitud. Estado: ${response.status}`, false);
            }
        } catch (error) {
            showMessage('Error durante la solicitud. Por favor, inténtalo de nuevo.', false);
        }
    }

    // Función para actualizar comentarios
    function updateComments(taskId, newComments) {
        const commentsContainer = document.getElementById('comments-' + taskId);
        const commentsList = commentsContainer.querySelector('ul');

        // Obtener los comentarios existentes
        const existingComments = Array.from(commentsList.children).map(comment => comment.textContent);

        // Filtrar y eliminar comentarios vacíos
        const uniqueNewComments = newComments.filter(comment => comment.trim() !== '');

        // Filtrar y eliminar comentarios duplicados
        const filteredNewComments = uniqueNewComments.filter(newComment => !existingComments.includes(newComment));

        // Crear elementos de comentario y agregarlos a la lista
        filteredNewComments.forEach(newComment => {
            const newCommentElement = document.createElement('li');
            newCommentElement.textContent = newComment;
            commentsList.appendChild(newCommentElement);
        });

        // Limpiar el campo de entrada de comentario después de agregarlos
        const commentInput = document.getElementById('comment_text-' + taskId);
        commentInput.value = '';
    }

    // Event listeners for Complete links
    document.querySelectorAll('.complete-link').forEach(function (link) {
        link.addEventListener('click', function (event) {
            event.preventDefault();
            const taskId = link.getAttribute('data-task-id');
            markTaskAsCompleted(taskId, link);
        });
    });

    // Event listeners for Add Comment buttons
    document.querySelectorAll('.add-comment-btn').forEach(function (btn) {
        btn.addEventListener('click', function (event) {
            event.preventDefault();
            const taskId = btn.getAttribute('data-task-id');
            addComment(taskId);
        });
    });

    // Event listeners for Delete links
    document.querySelectorAll('.delete-link').forEach(function (link) {
        link.addEventListener('click', function (event) {
            event.preventDefault();
            const taskId = link.getAttribute('data-task-id');
            deleteTask(taskId, link);
        });
    });

    // Event listeners for Modify links
    document.querySelectorAll('.modify-link').forEach(function (link) {
        link.addEventListener('click', function (event) {
            event.preventDefault();
            const taskId = link.getAttribute('data-task-id');
            modifyTask(taskId);
        });
    });

    // Function to delete a task
    async function deleteTask(taskId, link) {
        try {
            const response = await fetch(`/delete_task/${taskId}`, {
                method: 'POST'
            });

            if (response.ok) {
                const data = await response.json();

                if (data.success) {
                    // Remove the task element from the DOM
                    const taskElement = document.getElementById('task-' + taskId);
                    taskElement.remove();

                    showMessage(data.message, true);
                } else {
                    console.error('Failed to delete task.');
                    showMessage(data.message, false);
                }
            } else {
                console.error('Error during request. Status:', response.status);
                showMessage('Error during request.', false);
            }
        } catch (error) {
            console.error('Network error during request:', error);
            showMessage('Network error during request.', false);
        }
    }

    // Function to show messages
    function showMessage(message, success) {
        const messageContainer = document.createElement('div');
        messageContainer.className = success ? 'success-message' : 'error-message';
        messageContainer.innerText = message;

        // Insert the message in the main container
        const container = document.querySelector('.container');
        container.insertBefore(messageContainer, container.firstChild);

        // Remove the message after a few seconds
        setTimeout(() => {
            messageContainer.remove();
        }, 3000);
    }

    // On page load, categorize tasks into completed, pending, and overdue
    const allTasks = document.querySelectorAll('.task-list li');
    const completedTasksList = document.querySelector('.completed-tasks-list');

    allTasks.forEach(task => {
        const taskId = task.getAttribute('id').replace('task-', '');

        // Check if the task is completed
        const isCompleted = task.classList.contains('completed-task');

        // Check if the task is already in the Completed Tasks list
        const taskInCompletedList = completedTasksList.querySelector(`#task-${taskId}`);

        if (isCompleted && !taskInCompletedList) {
            completedTasksList.appendChild(task);
        } else if (taskInCompletedList) {
            // Remove the duplicate task from the original list
            task.remove();
        }
    });

    // Function to modify a task
    function modifyTask(taskId) {
        // Implement your modify task logic here
        console.log('Modify task with ID:', taskId);
    }

    // Event listeners for Mark Overdue links
    document.querySelectorAll('.mark-overdue-btn').forEach(function (link) {
        link.addEventListener('click', function (event) {
            event.preventDefault();
            const taskId = link.getAttribute('data-task-id');
            markTaskAsOverdue(taskId);
        });
    });

    // Function to mark a task as overdue
    async function markTaskAsOverdue(taskId) {
        try {
            const response = await fetch(`/mark_overdue/${taskId}`, {
                method: 'POST',
            });

            if (response.ok) {
                const data = await response.json();

                if (data.success) {
                    const taskElement = document.getElementById('task-' + taskId);
                    taskElement.classList.add('overdue-task');

                    showMessage(data.message, true);
                } else {
                    console.error('Failed to mark task as overdue.');
                    showMessage(data.message, false);
                }
            } else {
                console.error('Error during request. Status:', response.status);
                showMessage('Error during request.', false);
            }
        } catch (error) {
            console.error('Network error during request:', error);
            showMessage('Network error during request.', false);
        }
    }

});
