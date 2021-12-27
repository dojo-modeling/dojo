import os
import csv
import json
import random
from datetime import datetime, timedelta
from collections import defaultdict

from flask_script import Manager
from flask_migrate import Migrate, MigrateCommand

from app import app
from models import db, IntegrityError

migrate = Migrate(app, db)
manager = Manager(app)
manager.add_command('db', MigrateCommand)


@manager.option("-n", "--name", dest="name", default="Undefined")
def create_model(name):
    print("Running custom job: {}".format(name))
    # Model(name=name).save()


if __name__ == '__main__':
    manager.run()
