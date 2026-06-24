import socket
import sys
import os

def find_active_region(project_ref):
    regions = [
        "ap-south-1",      # Mumbai
        "us-east-1",       # N. Virginia
        "us-west-1",       # N. California
        "eu-central-1",    # Frankfurt
        "ap-southeast-1",  # Singapore
        "us-east-2",       # Ohio
        "us-west-2",       # Oregon
        "eu-west-1",       # Ireland
        "eu-west-2",       # London
        "eu-west-3",       # Paris
        "ap-northeast-1",  # Tokyo
        "ap-northeast-2",  # Seoul
        "ap-southeast-2",  # Sydney
        "sa-east-1",       # Sao Paulo
        "ca-central-1"     # Canada
    ]
    
    print("Checking regional pooler DNS records for project...")
    for region in regions:
        host = f"aws-0-{region}.pooler.supabase.com"
        try:
            ip = socket.gethostbyname(host)
            print(f" - Found active pooler host: {host} ({ip})")
            return region
        except socket.gaierror:
            continue
    return None

def main():
    project_ref = "ntmmdbuimcaqaoegfbwk"
    region = find_active_region(project_ref)
    
    if not region:
        print("\nError: Could not resolve any regional Supabase pooler host.")
        print("Please check your internet connection or verify your project ref.")
        sys.exit(1)
        
    pooler_host = f"aws-0-{region}.pooler.supabase.com"
    env_file = ".env"
    
    if not os.path.exists(env_file):
        print(f"\nError: {env_file} file not found in current directory.")
        sys.exit(1)
        
    with open(env_file, "r") as f:
        lines = f.readlines()
        
    updated = False
    new_lines = []
    for line in lines:
        if line.startswith("DATABASE_URL="):
            # Replace database url with pooler url
            new_line = f"DATABASE_URL=postgresql://postgres.ntmmdbuimcaqaoegfbwk:rHamS-xSH2suiGD@{pooler_host}:6543/postgres?pgbouncer=true\n"
            new_lines.append(new_line)
            updated = True
            print(f"\nUpdating DATABASE_URL to use IPv4 Pooler Host: {pooler_host}")
        else:
            new_lines.append(line)
            
    if updated:
        with open(env_file, "w") as f:
            f.writelines(new_lines)
        print("Successfully updated .env with the correct pooler configurations!")
    else:
        print("\nError: Could not locate DATABASE_URL line in .env.")
        
if __name__ == "__main__":
    main()
