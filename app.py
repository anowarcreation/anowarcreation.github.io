from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route("/")
def home():
    return "Anowar Creation PDF Verification API is running."

@app.route("/health")
def health():
    return jsonify({"status": "running"})

if __name__ == "__main__":
    import os
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 10000)))
