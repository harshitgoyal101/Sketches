# Allow Django's MySQL backend to work without compiling mysqlclient locally.
try:
    import pymysql

    pymysql.install_as_MySQLdb()
except ImportError:
    pass
