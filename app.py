
import os
import io
from flask import Flask, request, jsonify
from flask_cors import CORS
from pyhanko.pdf_utils.reader import PdfFileReader
from pyhanko.sign.validation import validate_pdf_signature
from pyhanko_certvalidator import ValidationContext
from pyhanko.pdf_utils.crypt import PdfKeyNotAvailableError

app = Flask(__name__)
CORS(app)

MAX_FILE_SIZE = 15 * 1024 * 1024
app.config["MAX_CONTENT_LENGTH"] = MAX_FILE_SIZE


@app.route("/")
def home():
    return "Anowar Creation PDF Verification API is running."


@app.route("/health")
def health():
    return jsonify({"status": "running"})


@app.route("/verify", methods=["POST"])
def verify_pdf():
    uploaded = request.files.get("file")

    if not uploaded:
        return jsonify({
            "success": False,
            "message": "Please upload a PDF file."
        }), 400

    if not uploaded.filename.lower().endswith(".pdf"):
        return jsonify({
            "success": False,
            "message": "Only PDF files are accepted."
        }), 400

    pdf_data = uploaded.read(MAX_FILE_SIZE + 1)

    if len(pdf_data) > MAX_FILE_SIZE:
        return jsonify({
            "success": False,
            "message": "PDF must be 15 MB or smaller."
        }), 413

    password = request.form.get("password") or None

    try:
        reader = PdfFileReader(
            io.BytesIO(pdf_data),
            password=password
        )

        embedded_signatures = reader.embedded_signatures

        if not embedded_signatures:
            return jsonify({
                "success": True,
                "has_signature": False,
                "message": (
                    "No embedded digital signature found. "
                    "A signature image is not a digital signature."
                )
            })

        results = []

        for sig in embedded_signatures:
            item = {
                "field_name": sig.field_name,
                "integrity_valid": False,
                "certificate_trusted": False,
                "status": "Could not verify"
            }

            try:
                status = validate_pdf_signature(
                    sig,
                    signer_validation_context=ValidationContext(
                        trust_roots=[],
                        allow_fetching=False
                    )
                )

                item["integrity_valid"] = bool(
                    status.intact and status.valid
                )
                item["certificate_trusted"] = bool(
                    status.trusted
                )

                if item["integrity_valid"] and item["certificate_trusted"]:
                    item["status"] = "Valid and trusted"
                elif item["integrity_valid"]:
                    item["status"] = (
                        "Signature integrity valid, "
                        "but certificate trust is not established"
                    )
                else:
                    item["status"] = (
                        "Invalid signature or document modification detected"
                    )

            except Exception as exc:
                item["status"] = "Could not verify this signature"
                item["error"] = str(exc)[:300]

            results.append(item)

        return jsonify({
            "success": True,
            "has_signature": True,
            "signatures": results,
            "download_allowed": any(
                item["integrity_valid"] for item in results
            ),
            "message": (
                "Verification completed. Review integrity and trust "
                "separately before relying on this document."
            )
        })

    except Exception:
        return jsonify({
            "success": False,
            "message": (
                "Could not open this PDF. It may be password-protected, "
                "damaged, or unsupported. Check the password and try again."
            )
        }), 400


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 10000))
    )
