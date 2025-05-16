from flask import Flask, render_template, request, jsonify, url_for, redirect
import os
import json
import uuid
from datetime import datetime
import dialogflow_api
import logging

app = Flask(__name__)
app.config['JSON_AS_ASCII'] = False
app.config['JSONIFY_MIMETYPE'] = 'application/json'
app.config['JSON_SORT_KEYS'] = False

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

global session_id
session_id = uuid.uuid4()

# Configuration
UPLOAD_FOLDER = 'static/uploads'
ALLOWED_EXTENSIONS = {'txt', 'pdf', 'png', 'jpg', 'jpeg', 'gif', 'doc', 'docx', 'xls', 'xlsx'}

# Create upload folder if it doesn't exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max upload size

# Helper function to check allowed file extensions
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def home():
    return render_template('index.html')
# Add these routes after your existing home route
@app.route('/my-trips')
def my_trips():
    return render_template('my-trips.html')

@app.route('/travel-information')
def travel_information():
    return render_template('travel-information.html')

@app.route('/destinations')
def destinations():
    return render_template('destinations.html')

@app.route('/executive-club')
def executive_club():
    return render_template('executive-club.html')

@app.route('/chat', methods=['POST'])
def chat():
    try:
        data = request.json
        if not data:
            return jsonify({"error": "No data received"}), 400

        message = data.get('message', '')
        if not message:
            return jsonify({"error": "No message provided"}), 400

        # Log the incoming message for debugging
        app.logger.info(f"Received message: {message}")
        
        # Send message to Dialogflow and get response
        dialogflow_response = dialogflow_api.run_sample([message], session_id)
        
        if not dialogflow_response or not dialogflow_response[0]:
            return jsonify({"error": "No response from Dialogflow"}), 500

        # Return the response
        return jsonify({"response": dialogflow_response[0]})

    except Exception as e:
        app.logger.error(f"Error in chat endpoint: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

# Route to handle file uploads (for actual file uploads in a real app)
@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    if file and allowed_file(file.filename):
        # Create unique filename to prevent collisions
        filename = str(uuid.uuid4()) + '_' + file.filename
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        
        return jsonify({
            'success': True,
            'filename': filename,
            'url': url_for('static', filename=f'uploads/{filename}')
        })
    
    return jsonify({'error': 'File type not allowed'}), 400
    
if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))