from flask import Flask, render_template, request, redirect, session, flash
import mysql.connector

app = Flask(__name__)
app.secret_key = "your_secret_key"

# Connect to MySQL
db = mysql.connector.connect(
    host="localhost",
    user="Rhyno_47",         # weka username ya MySQL
    password="CallMeMath", # weka password ya MySQL
    database="visit_mwanza"
)
cursor = db.cursor(dictionary=True)

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/guider")
def guider():
    return render_template("guider.html")

# Register
@app.route("/register", methods=["POST"])
def register():
    name = request.form["name"]
    email = request.form["email"]
    password = request.form["password"]

    cursor.execute("INSERT INTO users (name, email, password) VALUES (%s, %s, %s)", 
                   (name, email, password))
    db.commit()
    flash("Registration successful! Please log in.", "success")
    return redirect("/guider")

# Login
@app.route("/login", methods=["POST"])
def login():
    email = request.form["email"]
    password = request.form["password"]

    cursor.execute("SELECT * FROM users WHERE email=%s AND password=%s", (email, password))
    user = cursor.fetchone()

    if user:
        session["user"] = user["name"]
        flash("Welcome back, " + user["name"], "success")
        return redirect("/guider")
    else:
        flash("Invalid email or password", "danger")
        return redirect("/guider")

if __name__ == "__main__":
    app.run(debug=True)
