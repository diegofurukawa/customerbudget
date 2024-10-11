from django.db import migrations

def populate_document(apps, schema_editor):
    Customer = apps.get_model('budget', 'Customer')
    for index, customer in enumerate(Customer.objects.all()):
        if not customer.document:
            customer.document = f"DOC{index+1:05d}"  # Cria um documento temporário único
            customer.save()

class Migration(migrations.Migration):

    dependencies = [
        ('budget', '0010_populate_document_field'),  # Substitua pelo nome da migração anterior
    ]

    operations = [
        migrations.RunPython(populate_document),
    ]