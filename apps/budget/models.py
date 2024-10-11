from django.db import models
from django.db.models import Sum, F
from django.core.validators import RegexValidator, MinValueValidator


# Mantenha seus modelos existentes (como Customer) aqui
class Customer(models.Model):
    PERSON_TYPE_CHOICES = (
        (1, 'Física'),
        (2, 'Jurídica'),
    )
    
    name = models.CharField(max_length=100, verbose_name="Nome")
    document = models.CharField(max_length=20, unique=True, verbose_name="Documento", blank=True, null=True)
    customer_type = models.IntegerField(choices=PERSON_TYPE_CHOICES, default=1, verbose_name="Tipo de Cliente")
    birth_date = models.DateField(verbose_name="Data de Nascimento", blank=True, null=True)
    phone_regex = RegexValidator(
        regex=r'^\+?1?\d{9,15}$',
        message="O número de telefone deve estar no formato: '+999999999'. Até 15 dígitos permitidos."
    )
    phone = models.CharField(validators=[phone_regex], max_length=17, verbose_name="Celular")
    email = models.EmailField(unique=True, null=True, blank=True, verbose_name="E-mail")
    address = models.CharField(max_length=200, verbose_name="Endereço", blank=True, null=True)
    address_complement = models.CharField(max_length=100, verbose_name="Complemento", blank=True, null=True)
    enabled = models.BooleanField(default=True, verbose_name="Ativo")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Atualizado em")

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = "Cliente"
        verbose_name_plural = "Clientes"
        ordering = ['name']

# Adicione o novo modelo Material
class Material(models.Model):
    full_name = models.CharField(max_length=200, verbose_name="Nome Completo")
    nick_name = models.CharField(max_length=100, verbose_name="Apelido")
    description = models.TextField(verbose_name="Descrição", blank=True)
    cost_value = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        verbose_name="Valor de Custo",
        validators=[MinValueValidator(0)],
        default=0.00,  # Adicione esta linha
        null=False  # Adicione esta linha
        #,blank=True  # Adicione esta linha
    )
    active = models.BooleanField(default=True, verbose_name="Ativo")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Atualizado em")

    def __str__(self):
        return self.full_name

    class Meta:
        verbose_name = "Material"
        verbose_name_plural = "Materiais"
        ordering = ['full_name']

class Budget(models.Model):
    STATUS_CHOICES = (
        ('CREATED', 'Criado'),
        ('PENDING', 'Pendente Envio'),
        ('ACCEPTED', 'Aceito'),
        ('CANCELED', 'Cancelado'),
        ('SERVICE_ORDER', 'Ordem Serviço'),
    )
    
    customer = models.ForeignKey('Customer', on_delete=models.CASCADE, related_name='budgets')
    created_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='CREATED')
    enabled = models.BooleanField(default=True, verbose_name="Ativo")
    def calculate_total_cost(self):
        return self.items.aggregate(
            total=Sum(F('quantity') * F('material__cost_value'))
        )['total'] or 0

    def __str__(self):
        return f"Orçamento {self.id} - {self.customer.name}"

class BudgetItem(models.Model):
    budget = models.ForeignKey(Budget, on_delete=models.CASCADE, related_name='items')
    material = models.ForeignKey('Material', on_delete=models.CASCADE)
    quantity = models.DecimalField(max_digits=7, decimal_places=2, validators=[MinValueValidator(0.01)])
    enabled = models.BooleanField(default=True)  # Novo campo

    def __str__(self):
        return f"{self.material.full_name} - {self.quantity}"