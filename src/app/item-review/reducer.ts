import { Reducer } from 'redux';
import * as actions from './actions';
import { ActionType, getType } from 'typesafe-actions';
import { WorkingD2Rating, D2ItemReviewResponse, D2ItemUserReview } from './d2-dtr-api-types';
import { WorkingD1Rating, D1ItemReviewResponse, D1ItemUserReview } from './d1-dtr-api-types';
import { DimItem } from '../inventory/item-types';
import { getReviewKey, getD2Roll } from '../destinyTrackerApi/d2-itemTransformer';
import { RootState } from '../store/reducers';
import produce from 'immer';
import { DtrRating } from './dtr-api-types';

/** Each of the states here is keyed by an "item store key" - see getItemStoreKey */
export interface ReviewsState {
  /** Summary rating data for items (votes/values) */
  ratings: { [key: string]: DtrRating };
  /** In-progress user reviews for items. Eventually cleared when they get submitted to DTR. */
  userReviews: { [key: string]: WorkingD2Rating | WorkingD1Rating };
  /** Detailed reviews for items. */
  reviews: { [key: string]: D2ItemReviewResponse | D1ItemReviewResponse };
}

export type ReviewsAction = ActionType<typeof actions>;

const initialState: ReviewsState = {
  ratings: {},
  userReviews: {},
  reviews: {}
};

export const ratingsSelector = (state: RootState) => state.reviews.ratings;

export const reviews: Reducer<ReviewsState, ReviewsAction> = (
  state: ReviewsState = initialState,
  action: ReviewsAction
) => {
  switch (action.type) {
    case getType(actions.updateRatings):
      return {
        ...state,
        ratings: action.payload.itemStores
      };

    case getType(actions.clearRatings):
      return {
        ...initialState
      };

    case getType(actions.reviewsLoaded): {
      const key = action.payload.key;
      const reviewsData = action.payload.reviews;
      const userReview = (reviewsData.reviews as (D1ItemUserReview | D2ItemUserReview)[]).find(
        (r) => r.isReviewer
      );
      const existingUserReview = state.userReviews[key];

      return produce(state, (draft) => {
        // Update the working user review from submitted reviews
        if (userReview && !existingUserReview) {
          // TODO: This doesn't seem quite right
          draft.userReviews[key] = (userReview as unknown) as WorkingD2Rating | WorkingD1Rating;
        }
        draft.reviews[key] = reviewsData;
      });
    }

    case getType(actions.saveUserReview):
      return {
        ...state,
        userReviews: {
          ...state.userReviews,
          [getItemReviewsKey(action.payload.item)]: action.payload.review
        }
      };

    case getType(actions.markReviewSubmitted): {
      const key = action.payload.key;
      return produce(state, (draft) => {
        const userReview = draft.userReviews[key];
        if (userReview) {
          userReview.treatAsSubmitted = true;
        }
        const reviews = draft.reviews[key];
        if (reviews) {
          draft.reviews[key].reviews = (reviews.reviews as (
            | D1ItemUserReview
            | D2ItemUserReview)[]).filter((review) => !review.isReviewer) as (
            | D1ItemUserReview[]
            | D2ItemUserReview[]);
        }
      });
    }

    case getType(actions.purgeCachedReview): {
      const key = action.payload.key;
      return produce(state, (draft) => {
        delete draft.reviews[key];
        delete draft.userReviews[key];
      });
    }

    default:
      return state;
  }
};

// TODO: rename
export function getItemStoreKey(referenceId: number | string, roll: string | null) {
  return `${referenceId}-${roll || 'fixed'}`;
}

export function getItemReviewsKey(item: DimItem) {
  let roll: string | null = null;

  if (item.isDestiny1() && item.talentGrid) {
    roll = item.talentGrid.dtrRoll;
  } else if (item.isDestiny2()) {
    const reviewKey = getReviewKey(item);

    roll = getD2Roll(reviewKey.availablePerks);
  }

  return getItemStoreKey(item.hash, roll);
}

export function getRating(item: DimItem, ratings: ReviewsState['ratings']): DtrRating | undefined {
  return ratings[getItemReviewsKey(item)];
}

export function getReviews(
  item: DimItem,
  state: RootState
): D2ItemReviewResponse | D1ItemReviewResponse | undefined {
  return state.reviews.reviews[getItemReviewsKey(item)];
}

export function getUserReview(item: DimItem, state: RootState): WorkingD2Rating | WorkingD1Rating {
  return (
    state.reviews.userReviews[getItemReviewsKey(item)] ||
    (item.isDestiny1()
      ? {
          rating: 0,
          pros: '',
          review: '',
          cons: '',
          treatAsSubmitted: false
        }
      : {
          voted: 0,
          pros: '',
          cons: '',
          text: '',
          mode: 0,
          treatAsSubmitted: false
        })
  );
}

export function shouldShowRating(dtrRating: DtrRating | undefined) {
  return (
    dtrRating &&
    dtrRating.overallScore !== undefined &&
    (dtrRating.ratingCount > 2 || dtrRating.highlightedRatingCount > 0)
  );
}
