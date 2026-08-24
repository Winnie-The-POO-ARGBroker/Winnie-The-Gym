import logging
from django.conf import settings
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure

logger = logging.getLogger(__name__)

_mongo_client = None


def get_mongo_client():
    """
    Retorna la instancia del cliente MongoClient (Singleton).
    """
    global _mongo_client
    if _mongo_client is None:
        try:
            mongo_uri = getattr(settings, 'MONGODB', {}).get(
                'URI', 'mongodb://localhost:27017/'
            )
            _mongo_client = MongoClient(mongo_uri, serverSelectionTimeoutMS=3000)
            # Ping para verificar conexión
            _mongo_client.admin.command('ping')
            logger.info("Conexión exitosa a MongoDB")
        except ConnectionFailure as e:
            logger.error(f"Error al conectar con MongoDB: {e}")
            _mongo_client = None
            raise e
    return _mongo_client


def get_mongo_db():
    """
    Retorna la base de datos MongoDB configurada.
    """
    client = get_mongo_client()
    db_name = getattr(settings, 'MONGODB', {}).get('DB_NAME', 'winnie_gym_logs')
    return client[db_name]


def get_collection(collection_name):
    """
    Retorna una colección específica de MongoDB.
    """
    db = get_mongo_db()
    return db[collection_name]


def log_qr_event(payload: dict) -> bool:
    """
    Guarda un registro estructurado del historial de escaneo/generación de QR en MongoDB (colección 'qr_history').
    """
    try:
        collection = get_collection('qr_history')
        result = collection.insert_one(payload)
        return bool(result.inserted_id)
    except Exception as e:
        logger.error(f"Error al guardar log de QR en MongoDB: {e}")
        return False


def log_audit_event(payload: dict) -> bool:
    """
    Guarda un evento general de auditoría en MongoDB (colección 'audit_logs').
    """
    try:
        collection = get_collection('audit_logs')
        result = collection.insert_one(payload)
        return bool(result.inserted_id)
    except Exception as e:
        logger.error(f"Error al guardar log de auditoría en MongoDB: {e}")
        return False
