from rest_framework.routers import DefaultRouter
from .views import ProduitViewSet

router = DefaultRouter()
router.register('', ProduitViewSet)
urlpatterns = router.urls
