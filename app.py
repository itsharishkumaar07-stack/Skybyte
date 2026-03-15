from flask import Flask, render_template, request, jsonify, g, redirect, url_for
import sqlite3
import os

app = Flask(__name__)
DATABASE = os.path.join(os.path.dirname(__file__), 'database.db')


def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(DATABASE)
        db.row_factory = sqlite3.Row
    return db


def init_db():
    db = get_db()
    db.execute('''
        CREATE TABLE IF NOT EXISTS profile (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            age INTEGER NOT NULL,
            height REAL NOT NULL,
            weight REAL NOT NULL,
            blood_pressure TEXT NOT NULL,
            diabetes TEXT NOT NULL,
            cholesterol TEXT NOT NULL,
            cardiac TEXT NOT NULL DEFAULT 'No',
            pregnant TEXT NOT NULL DEFAULT 'No',
            pressure_status TEXT NOT NULL DEFAULT 'Normal',
            location TEXT NOT NULL DEFAULT '',
            calorie_goal INTEGER NOT NULL,
            preference TEXT NOT NULL
        )
    ''')
    # Add missing columns for older DB versions:
    for col_def in [
        ('cardiac','TEXT NOT NULL DEFAULT "No"'),
        ('pregnant','TEXT NOT NULL DEFAULT "No"'),
        ('pressure_status','TEXT NOT NULL DEFAULT "Normal"'),
        ('location','TEXT NOT NULL DEFAULT ""')
    ]:
        col, defn = col_def
        try:
            db.execute(f'ALTER TABLE profile ADD COLUMN {col} {defn}')
        except sqlite3.OperationalError:
            pass
    db.commit()


@app.before_request
def before_request():
    init_db()


@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()


def get_profile_row():
    db = get_db()
    cur = db.execute('SELECT * FROM profile ORDER BY id DESC LIMIT 1')
    row = cur.fetchone()
    return row


def profile_dict(row):
    if not row:
        return None
    return {
        'id': row['id'],
        'name': row['name'],
        'age': row['age'],
        'height': row['height'],
        'weight': row['weight'],
        'blood_pressure': row['blood_pressure'],
        'diabetes': row['diabetes'],
        'cholesterol': row['cholesterol'],
        'cardiac': row['cardiac'] if 'cardiac' in row.keys() else 'No',
        'pregnant': row['pregnant'] if 'pregnant' in row.keys() else 'No',
        'pressure_status': row['pressure_status'] if 'pressure_status' in row.keys() else 'Normal',
        'location': row['location'] if 'location' in row.keys() else '',
        'calorie_goal': row['calorie_goal'],
        'preference': row['preference']
    }


@app.route('/')
def home():
    profile = get_profile_row()
    return render_template('home.html', profile=profile_dict(profile))


@app.route('/weather')
def weather():
    return render_template('weather.html')


@app.route('/dishes')
def dishes():
    return render_template('dishes.html')


@app.route('/restaurants')
def restaurants():
    return render_template('restaurants.html')


@app.route('/recipe')
def recipe():
    return render_template('recipe.html')


@app.route('/warning')
def warning_page():
    return render_template('warning.html')


@app.route('/profile')
def profile():
    profile = get_profile_row()
    return render_template('profile.html', profile=profile_dict(profile))


@app.route('/api/profile', methods=['GET'])
def api_profile():
    profile = get_profile_row()
    if profile is None:
        return jsonify({'error': 'Profile not found'}), 404
    return jsonify(profile_dict(profile))


@app.route('/api/save-profile', methods=['POST'])
def save_profile():
    data = request.get_json() or {}
    required = ['name', 'age', 'height', 'weight', 'blood_pressure', 'diabetes', 'cholesterol', 'cardiac', 'pregnant', 'pressure_status', 'location', 'calorie_goal', 'preference']
    for k in required:
        if k not in data or str(data.get(k)).strip() == '':
            return jsonify({'error': f'Missing {k}'}), 400

    try:
        age = int(data['age'])
        height = float(data['height'])
        weight = float(data['weight'])
        calorie_goal = int(data['calorie_goal'])
    except ValueError:
        return jsonify({'error': 'Numeric values invalid'}), 400

    db = get_db()
    existing = get_profile_row()
    if existing:
        db.execute('''
            UPDATE profile SET name=?, age=?, height=?, weight=?, blood_pressure=?, diabetes=?, cholesterol=?, cardiac=?, pregnant=?, pressure_status=?, location=?, calorie_goal=?, preference=?
            WHERE id=?
        ''', (data['name'], age, height, weight, data['blood_pressure'], data['diabetes'], data['cholesterol'], data['cardiac'], data['pregnant'], data['pressure_status'], data['location'], calorie_goal, data['preference'], existing['id']))
    else:
        db.execute('''
            INSERT INTO profile (name, age, height, weight, blood_pressure, diabetes, cholesterol, cardiac, pregnant, pressure_status, location, calorie_goal, preference)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (data['name'], age, height, weight, data['blood_pressure'], data['diabetes'], data['cholesterol'], data['cardiac'], data['pregnant'], data['pressure_status'], data['location'], calorie_goal, data['preference']))
    db.commit()
    return jsonify({'success': True})


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
