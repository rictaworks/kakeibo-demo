import pytest
from services.classifier import (
    RuleClassifier,
    CATEGORY_ID_GROCERIES,
    CATEGORY_ID_DINING,
    CATEGORY_ID_TRANSPORT,
    CATEGORY_ID_HEALTH,
    CATEGORY_ID_FASHION,
    CATEGORY_ID_DAILY,
    CATEGORY_ID_LEISURE,
    CATEGORY_ID_OTHER,
    CONFIDENCE_HIGH,
    CONFIDENCE_MEDIUM,
    CONFIDENCE_LOW,
)


@pytest.fixture
def classifier() -> RuleClassifier:
    return RuleClassifier()


class TestStoreKeywordMatch:
    def test_supermarket_classifies_as_groceries(self, classifier: RuleClassifier) -> None:
        result = classifier.classify("イオン", [], None)
        assert result["category_id"] == CATEGORY_ID_GROCERIES
        assert result["confidence"] == CONFIDENCE_HIGH

    def test_fast_food_classifies_as_dining(self, classifier: RuleClassifier) -> None:
        result = classifier.classify("マクドナルド", [], None)
        assert result["category_id"] == CATEGORY_ID_DINING
        assert result["confidence"] == CONFIDENCE_HIGH

    def test_pharmacy_classifies_as_health(self, classifier: RuleClassifier) -> None:
        result = classifier.classify("マツモトキヨシ", [], None)
        assert result["category_id"] == CATEGORY_ID_HEALTH
        assert result["confidence"] == CONFIDENCE_HIGH

    def test_convenience_store_classifies_as_groceries(self, classifier: RuleClassifier) -> None:
        result = classifier.classify("セブンイレブン", [], None)
        assert result["category_id"] == CATEGORY_ID_GROCERIES
        assert result["confidence"] == CONFIDENCE_HIGH


class TestProductKeywordMatch:
    def test_milk_classifies_as_groceries(self, classifier: RuleClassifier) -> None:
        result = classifier.classify(None, [{"name": "牛乳", "amount": 200}], 200)
        assert result["category_id"] == CATEGORY_ID_GROCERIES
        assert result["confidence"] == CONFIDENCE_MEDIUM

    def test_medicine_classifies_as_health(self, classifier: RuleClassifier) -> None:
        result = classifier.classify(None, [{"name": "風邪薬", "amount": 800}], 800)
        assert result["category_id"] == CATEGORY_ID_HEALTH
        assert result["confidence"] == CONFIDENCE_MEDIUM


class TestFallbackToOther:
    def test_no_match_returns_other(self, classifier: RuleClassifier) -> None:
        result = classifier.classify(None, [], None)
        assert result["category_id"] == CATEGORY_ID_OTHER
        assert result["confidence"] is None

    def test_unknown_store_falls_through_to_keywords(self, classifier: RuleClassifier) -> None:
        result = classifier.classify("不明なお店", [{"name": "牛乳", "amount": 200}], 200)
        assert result["category_id"] == CATEGORY_ID_GROCERIES


class TestHardcodedConstants:
    def test_category_ids_are_integer_constants(self) -> None:
        assert isinstance(CATEGORY_ID_GROCERIES, int)
        assert isinstance(CATEGORY_ID_DINING, int)
        assert isinstance(CATEGORY_ID_TRANSPORT, int)
        assert isinstance(CATEGORY_ID_HEALTH, int)
        assert isinstance(CATEGORY_ID_FASHION, int)
        assert isinstance(CATEGORY_ID_DAILY, int)
        assert isinstance(CATEGORY_ID_LEISURE, int)
        assert isinstance(CATEGORY_ID_OTHER, int)

    def test_category_ids_are_in_valid_range(self) -> None:
        for cat_id in [CATEGORY_ID_GROCERIES, CATEGORY_ID_DINING, CATEGORY_ID_TRANSPORT,
                        CATEGORY_ID_HEALTH, CATEGORY_ID_FASHION, CATEGORY_ID_DAILY,
                        CATEGORY_ID_LEISURE, CATEGORY_ID_OTHER]:
            assert 1 <= cat_id <= 8

    def test_confidence_values_are_string_constants(self) -> None:
        assert isinstance(CONFIDENCE_HIGH, str)
        assert isinstance(CONFIDENCE_MEDIUM, str)
        assert isinstance(CONFIDENCE_LOW, str)
