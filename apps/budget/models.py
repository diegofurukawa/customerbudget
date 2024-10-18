from django.db import models
from django.db.models import Sum, F
from django.core.validators import RegexValidator, MinValueValidator
from django.utils import timezone


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
    ean_code = models.CharField(max_length=100, blank=True, null=True, verbose_name="Código EAN")
    description = models.TextField(verbose_name="Descrição", blank=True)
    active = models.BooleanField(default=True, verbose_name="Ativo")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Atualizado em")

    def __str__(self):
        return self.full_name
    
    def get_current_price(self):
        current_date = timezone.now().date()
        current_price = self.prices.filter(
            active=True,
            start_date__lte=current_date,
            end_date__gte=current_date
        ).order_by('-start_date').first()
        
        return current_price.total_value if current_price else 0

    class Meta:
        verbose_name = "Material"
        verbose_name_plural = "Materiais"
        ordering = ['full_name']

class MaterialPrice(models.Model):
    material = models.ForeignKey(Material, related_name='prices', on_delete=models.CASCADE)
    total_value = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Valor Total")
    start_date = models.DateField(verbose_name="Data de Início")
    end_date = models.DateField(verbose_name="Data de Fim")
    active = models.BooleanField(default=True, verbose_name="Ativo")

    def __str__(self):
        return f"{self.material.full_name} - R$ {self.total_value} ({self.start_date} to {self.end_date})"

class Budget(models.Model):
    STATUS_CHOICES = (
        ('CREATED', 'Criado'),
        ('CANCELED', 'Cancelado'),
        ('PENDING', 'Pendente Envio'),
        ('SENT', 'Enviado'),
        ('ACCEPTED', 'Aceito'),
        ('SERVICE_ORDER', 'Ordem de Serviço'),
        ('SCHEDULED', 'Agendado'),
    )
    
    customer = models.ForeignKey('Customer', on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='CREATED')
    created_at = models.DateTimeField(auto_now_add=True)
    enabled = models.BooleanField(default=True, verbose_name="Ativo")
    installation_date = models.DateField(null=True, blank=True)  # Adicionando o campo installation_date
    
    def get_status_display(self):
        return dict(self.STATUS_CHOICES)[self.status]
    
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
    installation_date = models.DateField(null=True, blank=True)

    def __str__(self):
        return f"{self.material.full_name} - {self.quantity}"
    


class Tax(models.Model):
    TYPE_CHOICES = [
        ('tax', 'Imposto'),
        ('fee', 'Taxa'),
    ]
    GROUP_CHOICES = [
        ('federal', 'Federal'),
        ('state', 'Estadual'),
        ('municipal', 'Municipal'),
        ('other', 'Outro'),
    ]
    OPERATOR_CHOICES = [
        ('+', 'Adição'),
        ('-', 'Subtração'),
        ('*', 'Multiplicação'),
        ('/', 'Divisão'),
    ]

    description = models.CharField(max_length=100, verbose_name="Descrição")
    type = models.CharField(max_length=10, choices=TYPE_CHOICES, verbose_name="Tipo")
    acronym = models.CharField(max_length=10, verbose_name="Sigla")
    group = models.CharField(max_length=20, choices=GROUP_CHOICES, verbose_name="Grupo")
    calc_operator = models.CharField(max_length=1, choices=[
        ('%', 'Percentual'),
        ('0', 'Fixo'),
        ('+', 'Adição'),
        ('-', 'Subtração'),
        ('*', 'Multiplicação'),
        ('/', 'Divisão'),
        
    ], default='%')
    value = models.DecimalField(max_digits=10, decimal_places=4, verbose_name="Valor")
    enabled = models.BooleanField(default=True, verbose_name="Ativo")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.description} ({self.acronym})"

    class Meta:
        verbose_name = "Taxa/Imposto"
        verbose_name_plural = "Taxas e Impostos"


from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal
from django.utils import timezone

class Price_List(models.Model):
    material = models.ForeignKey('Material', on_delete=models.CASCADE)
    value = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    tax = models.ForeignKey('Tax', on_delete=models.SET_NULL, null=True, blank=True)
    type_tax = models.CharField(max_length=1, choices=[('+', 'Positive'), ('-', 'Negative')], default='+')
    tax_value = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    value_total = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        self.calculate_values()
        super().save(*args, **kwargs)

    def calculate_values(self):
        if self.tax:
            self.tax_value = self.tax.value
            if self.tax.calc_operator == '%':
                factor = 1 + (self.tax_value / 100) if self.type_tax == '+' else 1 - (self.tax_value / 100)
                self.value_total = self.value * factor
            else:
                self.value_total = self.value + self.tax_value if self.type_tax == '+' else self.value - self.tax_value
        else:
            self.tax_value = 0
            self.value_total = self.value

    def is_current(self):
        today = timezone.now().date()
        return self.start_date <= today and (self.end_date is None or self.end_date >= today)

    def __str__(self):
        return f"{self.material.full_name} - R$ {self.value_total} ({self.start_date} to {self.end_date or 'No end date'})"

    class Meta:
        ordering = ['-start_date', 'material__full_name']
        verbose_name = "Lista de Preços"
        verbose_name_plural = "Listas de Preços"