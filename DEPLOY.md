# Deploy to AWS EC2

## Prerequisites
- EC2 instance (t3.micro or larger)
- Security Group: open port **5000** (or 80/443 via Nginx)
- Python 3.9+

---

## 1. Upload the app

```bash
scp -i your-key.pem -r food_cost_tracker/ ec2-user@<IP>:~/food_cost_tracker
