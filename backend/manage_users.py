import argparse

from .database import create_user, init_db


def main():
    parser = argparse.ArgumentParser(description="Crear o actualizar un usuario de VentasControl")
    parser.add_argument("--username", required=True)
    parser.add_argument("--password", required=True)
    parser.add_argument("--name", required=True)
    parser.add_argument("--workspace", required=True)
    args = parser.parse_args()
    init_db()
    create_user(args.username, args.password, args.name, args.workspace)
    print(f"Usuario {args.username} listo en el espacio {args.workspace}")


if __name__ == "__main__":
    main()
