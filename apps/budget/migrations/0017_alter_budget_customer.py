# Generated by Django 5.1.2 on 2024-10-11 14:49

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("budget", "0016_alter_customer_address_and_more"),
    ]

    operations = [
        migrations.AlterField(
            model_name="budget",
            name="customer",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE, to="budget.customer"
            ),
        ),
    ]
