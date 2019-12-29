import React from 'react';
import { DestinyAccount } from 'app/accounts/destiny-account';
import { RootState } from 'app/store/reducers';
import { connect } from 'react-redux';
import { DimItemInfo } from 'app/inventory/dim-item-info';
import ErrorBoundary from 'app/dim-ui/ErrorBoundary';
import styles from './SetsManager.m.scss';

interface ProvidedProps {
  account: DestinyAccount;
}
interface StoreProps {
  itemInfos: { [key: string]: DimItemInfo };
}

function mapStateToProps() {
  return (state: RootState): StoreProps => {
    return {
      itemInfos: state.inventory.itemInfos
    };
  };
}

type Props = ProvidedProps & StoreProps;

function SetsManager(props: Props) {
  console.log(props.account.destinyVersion);
  return (
    <div className={styles.page}>
      <ErrorBoundary name="Sets">
        <button className="dim-button">+Create new set</button>
      </ErrorBoundary>
    </div>
  );
}

export default connect<StoreProps>(mapStateToProps)(SetsManager);
