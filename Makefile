install:
	pip install -r requirements.txt

run:
	gunicorn wsgi:app --bind 0.0.0.0:5000 --workers 2 --timeout 60

run-dev:
	flask --app app run --debug --port 5000

.PHONY: install run run-dev
