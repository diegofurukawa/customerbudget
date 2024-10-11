# Generated by Django 5.1.2 on 2024-10-11 10:47

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("budget", "0012_remove_budget_enabled_budget_status"),
    ]

    operations = [
        migrations.AddField(
            model_name="customer",
            name="enabled",
            field=models.BooleanField(default=True, verbose_name="Ativo"),
        ),
        migrations.AlterField(
            model_name="customer",
            name="document",
            field=models.CharField(
                max_length=20, unique=True, verbose_name="Documento"
            ),
        ),
    ]
