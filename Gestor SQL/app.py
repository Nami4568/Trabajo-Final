from flask import Flask, render_template, request, jsonify, redirect, url_for
from datetime import datetime
import pymysql

app = Flask(__name__)

def get_connection():
    return pymysql.connect(
        host="db4free.net",
        user="nami4568asd",
        password="nadia4350",
        db="gestorsql",
        cursorclass=pymysql.cursors.DictCursor
    )


@app.route('/')
def index():
    try:
        with get_connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute("SELECT id, description, assignee, completed, due_date, priority, status FROM tasks")
                tasks = cursor.fetchall()

        # Obtener la fecha y hora actual
        now = datetime.utcnow().date()

        # Separar tareas pendientes y vencidas
        tasks_pending = [task for task in tasks if not task['completed'] and (not task['due_date'] or (task['due_date'] and task['due_date'] > now))]
        tasks_overdue = [task for task in tasks if not task['completed'] and task['due_date'] and task['due_date'] <= now]

        # Formatear las fechas en el formato deseado (DD/MM/AAAA)
        for task in tasks_pending + tasks_overdue:
            if task['due_date']:
                task['due_date'] = task['due_date'].strftime('%d/%m/%Y')

        # Debugging: imprimir las listas de tareas pendientes y vencidas
        # print("Tareas pendientes:", tasks_pending)
        # print("Tareas vencidas:", tasks_overdue)

        # Renderizar la plantilla con las tareas y la fecha actual
        return render_template('index.html', tasks_pending=tasks_pending, tasks_overdue=tasks_overdue, username='Administrador', now=now, alert_message=None)

    except pymysql.Error as e:
        print(f"Error al ejecutar la consulta: {e}")
        return render_template('index.html', tasks_pending=[], tasks_overdue=[], username='Administrador', now=datetime.utcnow().date(), alert_message='Error al obtener las tareas de la base de datos')

@app.route('/add_task', methods=['POST'])
def add_task():
    try:
        task_description = request.form.get('task_description')
        assignee = request.form.get('assignee')
        due_date_str = request.form.get('due_date')
        priority = request.form.get('priority')  
        status = request.form.get('status')

        due_date = datetime.strptime(due_date_str, '%Y-%m-%d').date() if due_date_str else None

        if not task_description or not assignee or not priority:
            raise ValueError("La descripción, el asignado y la prioridad son obligatorios.")

        with get_connection() as connection:
            with connection.cursor() as cursor:
                # Insertar la tarea
                cursor.execute("INSERT INTO tasks (description, assignee, completed, due_date, priority, status) VALUES (%s, %s, %s, %s, %s, %s)",
                               (task_description, assignee, False, due_date, priority, status))
                connection.commit()

        # Después de agregar la tarea, redireccionar a la página principal
        return redirect(url_for('index'))

    except ValueError as ve:
        print(f"Error en add_task(): {ve}")
        return redirect(url_for('index', alert_message=f'Error al agregar la tarea: {ve}'))

    except pymysql.Error as e:
        print(f"Error en add_task(): {e}")
        return redirect(url_for('index', alert_message='Error al agregar la tarea'))

    except Exception as e:
        print(f"Error inesperado en add_task(): {e}")

@app.route('/complete_task/<int:task_id>', methods=['POST'])
def complete_task(task_id):
    try:
        with get_connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute("SELECT completed FROM tasks WHERE id = %s", (task_id,))
                result = cursor.fetchone()

                if result and not result['completed']:
                    cursor.execute("UPDATE tasks SET completed = TRUE, status = 'completada' WHERE id = %s", (task_id,))
                    connection.commit()

                    # Obtener los datos actualizados de la tarea
                    cursor.execute("SELECT * FROM tasks WHERE id = %s", (task_id,))
                    updated_task = cursor.fetchone()

                    return jsonify({'success': True, 'message': 'Tarea marcada como completada exitosamente.', 'task': updated_task})
                else:
                    return jsonify({'success': False, 'message': 'La tarea ya está completada.'})

    except pymysql.Error as e:
        print(f"Error en complete_task(): {e}")
        return jsonify({'success': False, 'message': 'Tarea no encontrada o error al actualizar.'})

    except Exception as e:
        print(f"Error inesperado en complete_task(): {e}")
        return jsonify({'success': False, 'message': 'Error inesperado al completar la tarea.'})

@app.route('/delete_task/<int:task_id>', methods=['POST'])
def delete_task(task_id):
    try:
        with get_connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute("DELETE FROM tasks WHERE id = %s", (task_id,))
                connection.commit()

        return jsonify({'success': True, 'message': 'Tarea eliminada exitosamente.'})

    except pymysql.Error as e:
        print(f"Error en delete_task(): {e}")
        return jsonify({'success': False, 'message': 'Tarea no encontrada o error al eliminar.'})

    except Exception as e:
        print(f"Error inesperado en delete_task(): {e}")
        return jsonify({'success': False, 'message': 'Error inesperado al eliminar la tarea.'})

@app.route('/mark_overdue/<int:task_id>', methods=['POST'])
def mark_overdue(task_id):
    try:
        with get_connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute("SELECT due_date, completed FROM tasks WHERE id = %s", (task_id,))
                result = cursor.fetchone()

                if result and not result['completed']:
                    due_date = result['due_date']

                    if due_date and due_date <= datetime.utcnow().date():
                        cursor.execute("UPDATE tasks SET status = 'vencida' WHERE id = %s", (task_id,))
                        connection.commit()

                        return jsonify({'success': True, 'message': 'Tarea marcada como vencida exitosamente.'})
                    
                    return jsonify({'success': False, 'message': 'La tarea no está vencida.'})

                return jsonify({'success': False, 'message': 'La tarea no encontrada o ya está completada.'})

    except pymysql.Error as e:
        print(f"Error en mark_overdue(): {e}")
        return jsonify({'success': False, 'message': 'Error al marcar la tarea como vencida.'})

    except Exception as e:
        print(f"Error inesperado en mark_overdue(): {e}")
        return jsonify({'success': False, 'message': 'Error inesperado al marcar la tarea como vencida.'})  

@app.route('/get_comments/<int:task_id>', methods=['GET'])
def get_comments(task_id):
    try:
        with get_connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute("SELECT comments FROM tasks WHERE id = %s", (task_id,))
                result = cursor.fetchone()
                current_comments = result['comments'] if (result and result['comments'] is not None and result['comments'] != 'None') else ''
                comments_list = current_comments.split('\n') if current_comments else []
                return jsonify({'success': True, 'comments': comments_list})
    except pymysql.Error as e:
        print(f"Error en get_comments(): {e}")
        return jsonify({'success': False, 'comments': []})
    except Exception as e:
        print(f"Error inesperado en get_comments(): {e}")
        return jsonify({'success': False, 'comments': []})

@app.route('/add_comment/<int:task_id>', methods=['POST'])
def add_comment(task_id):
    try:
        comment_text = request.json.get('comment_text')
        # print(f"Valor del comentario obtenido del formulario: {comment_text}")

        with get_connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute("SELECT comments FROM tasks WHERE id = %s", (task_id,))
                result = cursor.fetchone()
                # print(f"Resultado de la consulta antes de la actualización: {result}")

                current_comments = result['comments'] if (result and result['comments'] is not None and result['comments'] != 'None') else ''
                new_comments = f"{current_comments}\n{comment_text}"

                cursor.execute("UPDATE tasks SET comments = %s WHERE id = %s", (new_comments, task_id))
                connection.commit()

                # print(f"Comentario actualizado correctamente para la tarea con ID {task_id}")

        return jsonify({'success': True, 'message': 'Comentario agregado exitosamente.', 'comments': new_comments.split('\n')})
    except pymysql.Error as e:
        print(f"Error en add_comment(): {e}")
        return jsonify({'success': False, 'message': 'Error al agregar el comentario.'})
    except Exception as e:
        print(f"Error inesperado en add_comment(): {e}")
        return jsonify({'success': False, 'message': 'Error inesperado al agregar el comentario.'})

if __name__ == '__main__':
    app.run(debug=True, port=8000)
